import { NextRequest, NextResponse } from 'next/server';

interface Citation {
  url: string;
  title: string;
}

interface ResponseResult {
  text: string;
  citations: Citation[];
}

async function callResponses(body: object): Promise<ResponseResult> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'OpenAI API 호출 실패');
  }

  const data = await res.json();

  // 문서 기준: output 배열에서 type === 'message'인 항목의 content[0]
  const messageOutput = data.output?.find(
    (item: { type: string }) => item.type === 'message'
  );
  const content = messageOutput?.content?.[0];
  const text: string = content?.text ?? data.output_text ?? '';

  // annotations에서 url_citation 추출 (중복 제거)
  const seen = new Set<string>();
  const citations: Citation[] = (content?.annotations ?? [])
    .filter((a: { type: string }) => a.type === 'url_citation')
    .reduce((acc: Citation[], a: { url: string; title: string }) => {
      if (!seen.has(a.url)) {
        seen.add(a.url);
        acc.push({ url: a.url, title: a.title });
      }
      return acc;
    }, []);

  return { text, citations };
}

function extractJSON(text: string): object {
  const match =
    text.match(/```json\s*([\s\S]*?)```/) ||
    text.match(/```\s*([\s\S]*?)```/) ||
    text.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error('응답에서 JSON을 파싱할 수 없습니다.');
  return JSON.parse(match[1]);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: '이미지를 업로드해주세요.' }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    // 1단계: gpt-4o 비전으로 이미지에서 음식 이름 추출
    const vision = await callResponses({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: '이 이미지에 있는 음식을 분석해주세요. 음식의 이름과 대략적인 양을 한국어로 알려주세요. 각 음식 항목을 쉼표로 구분해서 나열해주세요. 이미지에 나와있는 모든 재료를 포함하세요.',
            },
            {
              type: 'input_image',
              image_url: `data:${mimeType};base64,${base64}`,
            },
          ],
        },
      ],
    });

    if (!vision.text) throw new Error('이미지에서 음식을 인식하지 못했습니다.');

    // 2단계: web_search_preview로 각 음식의 영양 정보 검색
    const nutrition = await callResponses({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `다음 음식들의 영양 정보를 웹에서 검색해서 아래 JSON 형식으로만 응답해주세요. 다른 설명 없이 JSON만 출력하세요.

음식 목록: ${vision.text}

{
  "foods": [
    {
      "name": "음식명",
      "serving": "1회 제공량 (예: 100g, 1공기)",
      "calories": 칼로리_숫자,
      "carbs": 탄수화물_g_숫자,
      "protein": 단백질_g_숫자,
      "fat": 지방_g_숫자
    }
  ],
  "totalCalories": 총칼로리_숫자,
  "summary": "음식에 대한 한 줄 설명"
}`,
            },
          ],
        },
      ],
      tools: [{ type: 'web_search_preview' }],
    });

    if (!nutrition.text) throw new Error('영양 정보를 가져오지 못했습니다.');

    const result = extractJSON(nutrition.text);
    return NextResponse.json({ ...result, citations: nutrition.citations });
  } catch (error) {
    console.error('분석 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '음식 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
