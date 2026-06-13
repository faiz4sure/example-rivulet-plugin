import * as cheerio from "npm:cheerio";
import {
  CreateProvider,
  HomePageBuilder,
  SearchResultBuilder,
  LoadResultBuilder,
  EpisodeBuilder,
  MediaType,
  StreamResultBuilder,
  StreamBuilder,
} from "jsr:@rivulet/sdk";

const mainUrl = "https://net52.cc";
const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
  "Cache-Control": "max-age=0",
  Connection: "keep-alive",
  "sec-ch-ua":
    '"Not(A:Brand";v="8", "Chromium";v="144", "Android WebView";v="144"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Android"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13; Pixel 5 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Safari/537.36 /OS.Gatu v3.0",
  "X-Requested-With": "XMLHttpRequest",
  Referer: `${mainUrl}/mobile/home?app=1`,
};

let cookie_value = "";
const storageDir = new URL("../storage", import.meta.url).pathname;
const cookieFile = `${storageDir}/netflix_cookie.json`;

async function bypass(): Promise<string> {
  try {
    const cached = JSON.parse(Deno.readTextFileSync(cookieFile));
    if (cached.cookie && Date.now() - cached.timestamp < 54000000) {
      return cached.cookie;
    }
  } catch (e) {
    // ignore
  }

  console.log("bypassing for fresh netflix cookie...");
  const bypassHeaders = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "https://net22.cc",
    Referer: "https://net22.cc/verify2",
    "sec-ch-ua":
      '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  };

  const uuid = crypto.randomUUID();
  const body = new URLSearchParams();
  body.append("g-recaptcha-response", uuid);

  const res = await fetch("https://net52.cc/verify.php", {
    method: "POST",
    headers: bypassHeaders,
    body: body.toString(),
    redirect: "manual",
  });

  const cookies = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get("Set-Cookie") || ""];
  for (const cookie of cookies) {
    if (!cookie) continue;
    const match = cookie.match(/t_hash_t=([^;]+)/);
    if (match) {
      console.log("bypass done");
      const newCookie = match[1];

      try {
        Deno.mkdirSync(storageDir, { recursive: true });
        Deno.writeTextFileSync(
          cookieFile,
          JSON.stringify({
            cookie: newCookie,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        console.error(e);
      }

      return newCookie;
    }
  }

  console.log("bypass failed");
  return "";
}

const newTvDomains = [
  "aHR0cHM6Ly9tb2JpbGVkZXRlY3RzLmNvbQ==",
  "aHR0cHM6Ly9tb2JpbGVkZXRlY3QuYXBw",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LmFydA==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LmNj",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LmNsaWNr",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0Lmluaw==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LmxpdmU=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnBybw==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnNob3A=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnNpdGU=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnNwYWNl",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnN0b3Jl",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0LnZpcA==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0Lndpa2k=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0Lnh5eg==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5hcnQ=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5jYw==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5pbmZv",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5pbms=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5saXZl",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5wcm8=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy5zdG9yZQ==",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy50b3A=",
  "aHR0cHM6Ly9tb2JpZGV0ZWN0cy54eXo="
];

const newTvBaseHeaders = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  "X-Requested-With": "NetmirrorNewTV v1.0",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0 /OS.GatuNewTV v1.0",
  "Accept": "application/json, text/plain, */*"
};

let resolvedApiUrl = "";

async function resolveApiUrl(): Promise<string> {
  if (resolvedApiUrl) return resolvedApiUrl;
  for (const encoded of newTvDomains) {
      const base = atob(encoded).replace(/\/$/, '');
      try {
          const response = await fetch(`${base}/checknewtv.php`, { headers: newTvBaseHeaders });
          if (!response.ok) continue;
          const data = await response.json();
          if (data.token_hash) {
              resolvedApiUrl = atob(data.token_hash).replace(/\/$/, '');
              return resolvedApiUrl;
          }
      } catch (e) {}
  }
  throw new Error("failed to resolve api url");
}

function buildNewTvHeaders(ott: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
      ...newTvBaseHeaders,
      "Ott": ott,
      ...extra
  };
}

export default CreateProvider({
  id: "dummyProvider",
  name: "NetflixMirror",
  async getHomePage(page: number, request?: any) {
    if (!cookie_value) {
      cookie_value = await bypass();
    }

    const reqHeaders = {
      ...headers,
      Cookie: `t_hash_t=${cookie_value}; ott=nf; hd=on;`,
    };

    const res = await fetch(`${mainUrl}/mobile/home?app=1`, {
      headers: reqHeaders,
    });
    if (!res.ok) {
      throw new Error(`failed to fetch ${res.status} ${res.statusText}`);
    }

    const html = await res.text();

    try {
      // Deno.mkdirSync(storageDir, { recursive: true });
      // Deno.writeTextFileSync(`${storageDir}/debug.html`, html);
    } catch (e) {
      console.error(e);
    }

    const $ = cheerio.load(html);

    const sections: any[] = [];

    $(".tray-container, #top10").each((_: any, element: any) => {
      const el = $(element);
      const title = el.find("h2, span").first().text().trim();

      const items: any[] = [];
      el.find("article, .top10-post").each((_: any, post: any) => {
        const postEl = $(post);
        const aTag = postEl.find("a").first();
        const id = aTag.attr("data-post") || postEl.attr("data-post");
        const itemTitle =
          postEl.find("img").attr("alt") || aTag.attr("title") || `Movie ${id}`;

        if (id) {
          items.push(
            new SearchResultBuilder()
              .setTitle("")
              .setUrl(`net52://${id}`)
              .setApiName("dummyProvider")
              .setPoster(`https://imgcdn.kim/poster/v/${id}.jpg`)
              .build(),
          );
        }
      });

      if (items.length > 0) {
        sections.push({ title: title || "Trending", items });
      }
    });
    const homeBuilder = new HomePageBuilder();
    sections.forEach((sec) => {
      homeBuilder.addSection(sec.title, sec.items);
    });
    return homeBuilder.build();
  },

  async search(query: string, page?: number) {
    if (!cookie_value) {
      cookie_value = await bypass();
    }
    const reqHeaders = {
      ...headers,
      Cookie: `t_hash_t=${cookie_value}; ott=nf; hd=on;`,
    };
    const url = `${mainUrl}/mobile/search.php?s=${encodeURIComponent(query)}&t=${Math.floor(Date.now() / 1000)}`;
    const res = await fetch(url, { headers: reqHeaders });
    if (!res.ok) {
      throw new Error(`failed to search ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.searchResult) return [];

    return data.searchResult.map((it: any) =>
      new SearchResultBuilder()
        .setTitle(it.t)
        .setUrl(`net52://${it.id}`)
        .setApiName("dummyProvider")
        .setPoster(`https://imgcdn.kim/poster/v/${it.id}.jpg`)
        .build(),
    );
  },

  async load(url: string) {
    if (!cookie_value) {
      cookie_value = await bypass();
    }

    const id = url.replace("net52://", "");
    const reqHeaders = {
      ...headers,
      Cookie: `t_hash_t=${cookie_value}; ott=nf; hd=on;`,
    };
    const reqUrl = `${mainUrl}/mobile/post.php?id=${id}&t=${Math.floor(Date.now() / 1000)}`;
    const res = await fetch(reqUrl, { headers: reqHeaders });

    if (!res.ok) {
      throw new Error(`failed to load ${res.status}`);
    }

    const data = await res.json();
    const actors = data.cast
      ? data.cast
          .split(",")
          .map((name: string) => ({ name: name.trim() }))
          .filter((a: any) => a.name)
      : undefined;
    const genres = data.genre
      ? data.genre
          .split(",")
          .map((g: string) => g.trim())
          .filter(Boolean)
      : undefined;
    const recommendations = data.suggest
      ? data.suggest.map((it: any) =>
          new SearchResultBuilder()
            .setTitle(it.title || "")
            .setUrl(`net52://${it.id}`)
            .setApiName("dummyProvider")
            .setPoster(`https://imgcdn.kim/poster/v/${it.id}.jpg`)
            .build(),
        )
      : undefined;
    let duration: number | undefined = undefined;
    if (data.runtime) {
      const match = data.runtime.toString().match(/\d+/);
      if (match) duration = parseInt(match[0]);
    }
    const episodes: any[] = [];
    if (!data.episodes || data.episodes.length === 0 || !data.episodes[0]) {
      episodes.push(
        new EpisodeBuilder()
          .setTitle(data.title)
          .setUrl(url)
          .setNumber(1)
          .setSeason(1)
          .build(),
      );
    } else {
      data.episodes.forEach((it: any) => {
        if (!it) return;
        episodes.push(
          new EpisodeBuilder()
            .setTitle(it.t)
            .setUrl(`net52://${it.id}`)
            .setNumber(it.ep ? parseInt(it.ep.replace("E", "")) : 0)
            .setSeason(it.s ? parseInt(it.s.replace("S", "")) : 0)
            .setPoster(`https://imgcdn.kim/poster/v/150/${it.id}.jpg`)
            .setDescription("Hello description")
            .setRunTime(it.time || undefined)
            .build(),
        );
      });
      const getEpisodes = async (
        eid: string,
        sid: string,
        startPage: number,
      ) => {
        let pg = startPage;
        while (true) {
          const epUrl = `${mainUrl}/mobile/episodes.php?s=${sid}&series=${eid}&t=${Math.floor(Date.now() / 1000)}&page=${pg}`;
          const epRes = await fetch(epUrl, { headers: reqHeaders });
          if (!epRes.ok) break;
          const epData = await epRes.json();
          if (epData.episodes) {
            epData.episodes.forEach((it: any) => {
              if (!it) return;
              episodes.push(
                new EpisodeBuilder()
                  .setTitle(it.t)
                  .setUrl(`net52://${it.id}`)
                  .setNumber(it.ep ? parseInt(it.ep.replace("E", "")) : 0)
                  .setSeason(it.s ? parseInt(it.s.replace("S", "")) : 0)
                  .setPoster(`https://imgcdn.kim/epimg/150/${it.id}.jpg`)
                  .setDescription("hello description")
                  .setRunTime(it.time || undefined)
                  .build(),
              );
            });
          }
          if (epData.nextPageShow === 0) break;
          pg++;
        }
      };
      if (data.nextPageShow === 1 && data.nextPageSeason) {
        await getEpisodes(id, data.nextPageSeason, 2);
      }
      if (data.season && Array.isArray(data.season)) {
        const otherSeasons = data.season.slice(0, -1);
        for (const s of otherSeasons) {
          await getEpisodes(id, s.id, 1);
        }
      }
    }

    const loadBuilder = new LoadResultBuilder()
      .setTitle(data.title || `Movie ${id}`)
      .setUrl(url)
      .setApiName("dummyProvider")
      .setType(
        !data.episodes || !data.episodes[0]
          ? MediaType.Movie
          : MediaType.TvSeries,
      )
      .setPoster(`https://imgcdn.kim/poster/v/${id}.jpg`)
      .setBackgroundPoster(`https://imgcdn.kim/poster/h/${id}.jpg`)
      .setPlot(data.desc);

    const yearInt = parseInt(data.year);
    if (yearInt) {
      loadBuilder.setYear(yearInt);
    }

    const scoreVal = parseFloat((data.match || "").replace("IMDb ", ""));
    if (scoreVal) {
      loadBuilder.setScore(scoreVal);
    }

    if (duration) {
      loadBuilder.setDuration(duration);
    }
    if (genres) {
      loadBuilder.setGenres(genres);
    }
    if (episodes.length > 0) {
      loadBuilder.addEpisodes(episodes);
    }

    const result = loadBuilder.build();
    result.actors = actors;
    result.recommendations = recommendations;
    result.contentRating = data.ua;
    result.posterHeaders = { Referer: `${mainUrl}/home` };

    return result;
  },

  async loadLinks(data: string) {
    const id = data.replace("net52://", "");
    const apiBase = await resolveApiUrl();
    const reqHeaders = buildNewTvHeaders("nf", { "Usertoken": "" });

    const reqUrl = `${apiBase}/newtv/player.php?id=${id}`;
    const res = await fetch(reqUrl, { headers: reqHeaders });
    if (!res.ok) {
      throw new Error(`failed to load links ${res.status}`);
    }

    const resData = await res.json();
    if (resData.status !== "ok" || !resData.video_link) {
      throw new Error("failed to extract stream link");
    }

    const stream = new StreamBuilder()
      .setTitle("Netflix Mirror Server")
      .setUrl(resData.video_link)
      .setIsM3u8(true)
      .setHeaders({
        Referer: resData.referer || apiBase,
        Cookie: "hd=on"
      })
      .build();

    return new StreamResultBuilder().addStream(stream).build();
  },
});
