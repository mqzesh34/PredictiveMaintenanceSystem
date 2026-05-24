const { GEMINI_API_KEY, GEMINI_MODEL } = require("../config/env");

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function formatTelemetry(telemetry) {
  return [
    `UDI: ${telemetry.udi ?? "bilinmiyor"}`,
    `Ürün ID: ${telemetry.productId ?? "bilinmiyor"}`,
    `Tip: ${telemetry.type ?? "bilinmiyor"}`,
    `Hava sıcaklığı: ${telemetry.airTemperature ?? "bilinmiyor"} K`,
    `Makine sıcaklığı: ${telemetry.processTemperature ?? "bilinmiyor"} K`,
    `Motor devri: ${telemetry.rotationalSpeed ?? "bilinmiyor"} rpm`,
    `Tork: ${telemetry.torque ?? "bilinmiyor"} Nm`,
    `Takım aşınması: ${telemetry.toolWear ?? "bilinmiyor"} min`,
    `Makine arızası: ${telemetry.machineFailure ?? "bilinmiyor"}`,
    `TWF: ${telemetry.twf ?? 0}`,
    `HDF: ${telemetry.hdf ?? 0}`,
    `PWF: ${telemetry.pwf ?? 0}`,
    `OSF: ${telemetry.osf ?? 0}`,
    `RNF: ${telemetry.rnf ?? 0}`,
    `Zaman: ${telemetry.timestamp ?? "bilinmiyor"}`,
  ].join("\n");
}

function getActiveFailures(telemetry) {
  const failures = [
    ["TWF", telemetry.twf, "takım aşınması sinyali"],
    ["HDF", telemetry.hdf, "ısı dağılımı sinyali"],
    ["PWF", telemetry.pwf, "güç aktarımı sinyali"],
    ["OSF", telemetry.osf, "aşırı yük sinyali"],
    ["RNF", telemetry.rnf, "rastgele arıza sinyali"],
  ]
    .filter(([, value]) => value === 1)
    .map(([code, , description]) => `${code}: ${description}`);

  return failures.length === 0
    ? "MF: genel makine arızası"
    : failures.join(", ");
}

function buildPrompt(telemetry) {
  return [
    "Sen bir kestirimci bakım uzmanısın.",
    "Aşağıdaki makine telemetrisine göre Türkçe, net ve neden-sonuç odaklı bakım analizi üret.",
    "Kesin teşhis iddiası kurma; her yorumu 'olabilir', 'işaret ediyor', 'destekliyor' gibi olasılık diliyle yaz.",
    "Metrikleri tek tek tekrar anlatma; metrikler arasında ilişki kur.",
    "Örneğin tork yüksek ve devir normalse yüklenme/sürtünme olasılığını; makine sıcaklığı hava sıcaklığına göre ayrışıyorsa ısıl zorlanma olasılığını; takım aşınması yüksekse tork artışını açıklayan etkiyi yorumla.",
    "Aksiyon, talimat, yapılacak iş, kontrol adımı veya bakım önerisi yazma.",
    "Öncelik alanı yazma.",
    "Ham ölçüm değerlerini yazma; değerler arayüzde ayrıca gösteriliyor.",
    "'Kontrol edilmeli', 'değerlendirilmeli', 'izlenmeli', 'bakılmalı' gibi genel aksiyon cümleleri kullanma.",
    "Markdown, madde işareti ve numaralı liste kullanma.",
    "Yanıtı sadece şu formatta üret:",
    "OLASI_NEDEN: arıza kodunu ve metrik ilişkisini bağlayan tek tamamlanmış cümle",
    "METRIK: metrik adı | bu metrik diğer metriklerle birlikte neye işaret ediyor, tek tamamlanmış cümle",
    "METRIK: metrik adı | bu metrik diğer metriklerle birlikte neye işaret ediyor, tek tamamlanmış cümle",
    "İlgili tüm anlamlı METRIK satırlarını yaz; gereksiz tekrar yapma.",
    "OLASI_NEDEN 12-18 kelime arasında olmalı ve eksik bitmemeli.",
    "Her METRIK yorumu 14-22 kelime arasında olmalı ve eksik bitmemeli.",
    "Her METRIK yorumunda 'çünkü', 'bu yüzden', 'ile birlikte' veya 'işaret ediyor' ifadelerinden en az birini kullan.",
    "Giriş cümlesi yazma. 'İsteğinizi yaptım', 'Elbette', 'İşte', 'Tabii' gibi ifadeler kullanma.",
    "Doğrudan OLASI_NEDEN satırıyla başla.",
    "",
    "Aktif arıza sinyalleri:",
    getActiveFailures(telemetry),
    "",
    "Telemetri:",
    formatTelemetry(telemetry),
  ].join("\n");
}

function stripOpeningFiller(text) {
  return text
    .replace(
      /^(isteğinizi yaptım[,.!:\s-]*|elbette[,.!:\s-]*|tabii[,.!:\s-]*|işte[,.!:\s-]*|aşağıda[^\n]*:\s*)/i,
      "",
    )
    .trim();
}

async function requestGemini(prompt) {
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [
          {
            text: "Sadece kestirimci bakım ve makine telemetrisi bağlamında yanıt ver.",
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 1024,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || "Gemini API isteği başarısız oldu.";
    const err = new Error(message);
    err.statusCode = response.status;
    throw err;
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini API boş yanıt döndürdü.");
  }

  return stripOpeningFiller(text);
}

const createRecommendation = async (req, res) => {
  try {
    const { telemetry } = req.body;

    if (!telemetry || typeof telemetry !== "object") {
      res.status(400).json({ message: "Telemetry verisi zorunlu." });
      return;
    }

    const prompt = buildPrompt(telemetry);
    const recommendation = await requestGemini(prompt);

    res.json({ recommendation });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      message: err.message || "Yapay zeka önerisi alınamadı.",
    });
  }
};

module.exports = {
  createRecommendation,
};
