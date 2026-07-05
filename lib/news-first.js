const axios = require("axios");
const cheerio = require("cheerio");

// Image එක exists දැයි පරීක්ෂා කිරීමට
async function imageExists(imageUrl) {
  if (!imageUrl) return false;
  try {
    const response = await axios.head(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://sinhala.newsfirst.lk/",
      },
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function getNews() {
  try {
    const url = "https://sinhala.newsfirst.lk/";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    const newsItems = [];
    const seen = new Set();

    // සියලුම <a> ටැග් scan කරන්න
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();

      if (
        href &&
        text &&
        text.length > 10 &&
        (href.includes("/202") || href.includes("/story/"))
      ) {
        const fullUrl = href.startsWith("http")
          ? href
          : `https://sinhala.newsfirst.lk${href}`;

        if (!seen.has(fullUrl)) {
          seen.add(fullUrl);
          newsItems.push({
            title: text,
            link: fullUrl,
          });
        }
      }
    });

    // ප්‍රධාන පුවත් 5ක් පමණක් තබා ගන්න
    const topFive = newsItems.slice(0, 5);

    // එක් එක් පුවතට අදාළ image එක ලබා ගැනීම
    for (let i = 0; i < topFive.length; i++) {
      try {
        const item = topFive[i];
        const { data: pageData } = await axios.get(item.link, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://sinhala.newsfirst.lk/",
          },
          timeout: 10000,
        });
        const $$ = cheerio.load(pageData);
        let imageUrl =
          $$('meta[property="og:image"]').attr("content") ||
          $$('meta[name="twitter:image"]').attr("content") ||
          "";

        // Image URL එක හිස් නම් හෝ exists නොවේ නම් placeholder එකක් දාන්න
        if (imageUrl) {
          const exists = await imageExists(imageUrl);
          if (!exists) {
            imageUrl = "https://sinhala.newsfirst.lk/assets/default-news-image.jpg";
          }
        } else {
          imageUrl = "https://sinhala.newsfirst.lk/assets/default-news-image.jpg";
        }

        item.image = imageUrl;
      } catch (err) {
        item.image = "https://sinhala.newsfirst.lk/assets/default-news-image.jpg";
      }
    }

    // අවසාන ප්‍රතිඵලය (status, creator, team ඉහළට)
    const result = {
      status: true,
      creator: "Pathum Rajapakshe",
      team: "VISPER INC",
      results: topFive,
    };

    // stdout එකට JSON ලෙස ලියන්න
    process.stdout.write(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    process.stdout.write(
      JSON.stringify({
        status: false,
        creator: "Pathum Rajapakshe",
        team: "VISPER INC",
        results: [],
        error: error.message,
      })
    );
    return [];
  }
}

getNews();
