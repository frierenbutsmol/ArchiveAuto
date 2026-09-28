const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle browser/app preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Gemini API key is not configured.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const body = await req.json();

    const {
      message,
      mode,
      vehicle,
      maintenance,
      repairs,
      parts,
      documents,
    } = body;

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Message is required.',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let systemInstruction = `
You are the AI Assistant for ArchiveAuto, a vehicle maintenance
and management mobile application.

Give useful, practical, and easy-to-understand vehicle maintenance
and car-care information.

Keep answers reasonably concise.

Do not invent vehicle information, maintenance records, repair
records, parts, documents, mileage, prices, dates, or specifications.

If information about the user's vehicle is not provided, say that
you do not have that information.

For safety-related problems involving brakes, steering, overheating,
fuel leaks, or other potentially dangerous issues, recommend having
the vehicle inspected by a qualified mechanic when appropriate.
`;

    if (mode === 'vehicle') {
      systemInstruction += `

The user is currently using Vehicle Aware mode.

Use the vehicle information and records below when answering the
question.

VEHICLE:
${JSON.stringify(vehicle ?? {}, null, 2)}

MAINTENANCE RECORDS:
${JSON.stringify(maintenance ?? [], null, 2)}

REPAIR RECORDS:
${JSON.stringify(repairs ?? [], null, 2)}

PART REPLACEMENTS:
${JSON.stringify(parts ?? [], null, 2)}

DOCUMENTS:
${JSON.stringify(documents ?? [], null, 2)}

Only treat the supplied information as factual information about
the user's vehicle.

Do not make up missing records or maintenance history.
`;

    } else {
      systemInstruction += `

The user is currently using General Q&A mode.

Answer using general vehicle maintenance and car-care knowledge.

Do not assume the user owns a particular vehicle unless vehicle
information is provided.
`;
    }

    const prompt = `${systemInstruction}

USER QUESTION:
${message}`;

    const geminiResponse = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/interactions',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiApiKey,
    },
    body: JSON.stringify({
      model: 'gemini-3.6-flash',
      input: prompt,
    }),
  }
);

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error(
        'Gemini API error:',
        JSON.stringify(geminiData)
      );

      return new Response(
        JSON.stringify({
          error:
            geminiData?.error?.message ||
            'Gemini API request failed.',
        }),
        {
          status: geminiResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const reply =
      geminiData?.outputs?.find(
        (output) => output?.type === 'text'
      )?.text ||
      geminiData?.steps
        ?.find((step) => step?.type === 'model_output')
        ?.content?.find((content) => content?.type === 'text')
        ?.text;

    if (!reply) {
      return new Response(
        JSON.stringify({
          error: 'Gemini returned an empty response.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        reply,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('AI chat error:', error);

    return new Response(
      JSON.stringify({
        error: 'Something went wrong while processing your question.',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});