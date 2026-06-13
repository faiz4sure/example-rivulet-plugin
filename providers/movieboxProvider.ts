import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { 
  CreateProvider, 
  HomePageBuilder, 
  SearchResultBuilder, 
  LoadResultBuilder, 
  EpisodeBuilder, 
  MediaType,
  StreamBuilder,
  StreamResultBuilder
} from "jsr:@rivulet/sdk";

const mainUrl = "https://api3.aoneroom.com";

const secretKeyDefault = Buffer.from("76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O", "base64");
const secretKeyAlt = Buffer.from("Xqn2nnO41/L92o1iuXhSLHTbXvY4Z5ZZ62m8mSLA", "base64");

function md5(input: Buffer | string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

function reverseString(input: string): string {
  return input.split('').reverse().join('');
}

function generateXClientToken(hardcodedTimestamp?: number): string {
  const timestamp = (hardcodedTimestamp || Date.now()).toString();
  const reversed = reverseString(timestamp);
  const hash = md5(reversed);
  return `${timestamp},${hash}`;
}

function generateDeviceId(): string {
  return crypto.randomBytes(16).toString('hex');
}
const deviceId = generateDeviceId();

function randomBrandModel() {
  const brandModels = {
      "Samsung": ["SM-S918B", "SM-A528B", "SM-M336B"],
      "Xiaomi": ["2201117TI", "M2012K11AI", "Redmi Note 11"],
      "OnePlus": ["LE2111", "CPH2449", "IN2023"],
      "Google": ["Pixel 6", "Pixel 7", "Pixel 8"],
      "Realme": ["RMX3085", "RMX3360", "RMX3551"]
  };
  const brands = Object.keys(brandModels);
  const brand = brands[Math.floor(Math.random() * brands.length)];
  const models = brandModels[brand as keyof typeof brandModels];
  const model = models[Math.floor(Math.random() * models.length)];
  return { brand, model };
}

function buildCanonicalString(
  method: string,
  accept: string,
  contentType: string,
  url: string,
  body: string | null,
  timestamp: number
): string {
  const parsed = new URL(url);
  const path = parsed.pathname || "";
  
  let query = "";
  if (parsed.searchParams.size > 0) {
      const keys = Array.from(new Set(parsed.searchParams.keys())).sort();
      const parts: string[] = [];
      for (const k of keys) {
          const vals = parsed.searchParams.getAll(k);
          for (const v of vals) {
              parts.push(`${k}=${v}`);
          }
      }
      query = parts.join("&");
  }
  
  const canonicalUrl = query.length > 0 ? `${path}?${query}` : path;
  
  let bodyHash = "";
  let bodyLength = "";
  if (body) {
      const bodyBuffer = Buffer.from(body, 'utf-8');
      const trimmed = bodyBuffer.length > 102400 ? bodyBuffer.subarray(0, 102400) : bodyBuffer;
      bodyHash = md5(trimmed);
      bodyLength = bodyBuffer.length.toString();
  }
  
  return `${method.toUpperCase()}\n${accept || ""}\n${contentType || ""}\n${bodyLength}\n${timestamp}\n${bodyHash}\n${canonicalUrl}`;
}

function generateXTrSignature(
  method: string,
  accept: string,
  contentType: string,
  url: string,
  body: string | null = null,
  useAltKey: boolean = false,
  hardcodedTimestamp?: number
): string {
  const timestamp = hardcodedTimestamp || Date.now();
  const canonical = buildCanonicalString(method, accept, contentType, url, body, timestamp);
  const secretBytes = useAltKey ? secretKeyAlt : secretKeyDefault;
  
  const mac = crypto.createHmac('md5', secretBytes);
  const signature = mac.update(canonical, 'utf-8').digest();
  const signatureB64 = signature.toString('base64');
  
  return `${timestamp}|2|${signatureB64}`;
}

export default CreateProvider({
  id: "movieboxProvider",
  name: "MovieBox",
  lang: "hi",
  types: ["Movie", "TvSeries"],
  async getHomePage(page: number, request?: any) {
    const perPage = 15;
    const categories = [
        { name: "Trending", id: "4516404531735022304" },
        { name: "Trending in Cinema", id: "5692654647815587592" },
        { name: "Bollywood", id: "414907768299210008" },
        { name: "South Indian", id: "3859721901924910512" },
        { name: "Hollywood", id: "8019599703232971616" },
        { name: "Top Series This Week", id: "4741626294545400336" },
        { name: "Anime", id: "8434602210994128512" }
    ];

    const sections = await Promise.all(categories.map(async (category) => {
        const url = `${mainUrl}/wefeed-mobile-bff/tab/ranking-list?tabId=0&categoryType=${category.id}&page=${page}&perPage=${perPage}`;
        const xClientToken = generateXClientToken();
        const xTrSignature = generateXTrSignature("GET", "application/json", "application/json", url);

        const headers = {
            "user-agent": "com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)",
            "accept": "application/json",
            "content-type": "application/json",
            "connection": "keep-alive",
            "x-client-token": xClientToken,
            "x-tr-signature": xTrSignature,
            "x-client-info": JSON.stringify({"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":deviceId,"install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}),
            "x-client-status": "0",
        };

        const res = await fetch(url, { headers });
        const json = await res.json();
        const items = json.data?.items || json.data?.subjects || [];        
        const searchItems = items.map((item: any) => 
          new SearchResultBuilder()
            .setTitle(item.title?.replace(/\[.*?\]/, ""))
            .setUrl(`moviebox://${item.subjectId}`)
            .setApiName("movieboxProvider")
            .setPoster(item.cover?.url)
            .setQuality(item.imdbRatingValue)
            .build()
        );
        return {
          title: category.name,
          items: searchItems,
          isHorizontalImages: false
        };
    }));

    const homeBuilder = new HomePageBuilder();
    sections.forEach(sec => {
        homeBuilder.addSection(sec.title, sec.items, sec.isHorizontalImages);
    });

    return homeBuilder.build();
  },

  async search(query: string, page?: number) {
    const url = `${mainUrl}/wefeed-mobile-bff/subject-api/search/v2`;
    const jsonBody = `{"page": ${page || 1}, "perPage": 20, "keyword": "${query}"}`;    
    const xClientToken = generateXClientToken();
    const xTrSignature = generateXTrSignature("POST", "application/json", "application/json; charset=utf-8", url, jsonBody);    
    const headers = {
        "user-agent": "com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)",
        "accept": "application/json",
        "content-type": "application/json; charset=utf-8",
        "connection": "keep-alive",
        "x-client-token": xClientToken,
        "x-tr-signature": xTrSignature,
        "x-client-info": `{"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":"${deviceId}","install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}`,
        "x-client-status": "0"
    };
    const res = await fetch(url, { 
      method: "POST",
      headers,
      body: jsonBody
    });
    if (!res.ok) {
      throw new Error(`failed to search ${res.status}`);
    }
    const json = await res.json();
    const results = json.data?.results || [];    
    const searchItems: any[] = [];    
    for (const result of results) {
        const subjects = result.subjects;
        if (!subjects || !Array.isArray(subjects)) continue;
        
        for (const subject of subjects) {
            const title = subject.title?.replace(/\[.*?\]/, "");
            if (!title) continue;
            const id = subject.subjectId;
            if (!id) continue;
            const coverImg = subject.cover?.url;
            const subjectType = subject.subjectType || 1;
            const type = subjectType === 2 || subjectType === 7 ? MediaType.TvSeries : MediaType.Movie;
            
            searchItems.push(
              new SearchResultBuilder()
                .setTitle(title)
                .setUrl(`moviebox://${id}`)
                .setApiName("movieboxProvider")
                .setPoster(coverImg)
                .setQuality(subject.imdbRatingValue)
                .setType(type)
                .build()
            );
        }
    }

    return searchItems;
  },

  async load(url: string) {
    const id = url.replace("moviebox://", "").split('?')[0];
    const finalUrl = `${mainUrl}/wefeed-mobile-bff/subject-api/get?subjectId=${id}`;
    const xClientToken = generateXClientToken();
    const xTrSignature = generateXTrSignature("GET", "application/json", "application/json", finalUrl);

    const headers = {
        "user-agent": "com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)",
        "accept": "application/json",
        "content-type": "application/json",
        "connection": "keep-alive",
        "x-client-token": xClientToken,
        "x-tr-signature": xTrSignature,
        "x-client-info": JSON.stringify({"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":deviceId,"install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}),
        "x-client-status": "0",
        "x-play-mode": "2"
    };

    const res = await fetch(finalUrl, { headers });
    const json = await res.json();
    const data = json.data;

    if (!data) throw new Error("no data found");

    const title = data.title?.replace(/\[.*?\]/, "");
    const type = data.subjectType === 2 || data.subjectType === 7 ? MediaType.TvSeries : MediaType.Movie;

    const episodes = [];
    if (type === MediaType.TvSeries) {
        const seasonUrl = `${mainUrl}/wefeed-mobile-bff/subject-api/season-info?subjectId=${id}`;
        const seasonSig = generateXTrSignature("GET", "application/json", "application/json", seasonUrl);
        const seasonHeaders = { ...headers, "x-tr-signature": seasonSig };
        const seasonRes = await fetch(seasonUrl, { headers: seasonHeaders });
        const seasonJson = await seasonRes.json();
        
        const seasons = seasonJson.data?.seasons || [];
        for (const s of seasons) {
            const sn = s.se || 1;
            const maxEp = s.maxEp || 1;
            for (let e = 1; e <= maxEp; e++) {
                episodes.push(
                  new EpisodeBuilder()
                    .setTitle(`Episode ${e}`)
                    .setUrl(`moviebox://${id}|${sn}|${e}`)
                    .setNumber(e)
                    .setSeason(sn)
                    .setPoster(data.cover?.url)
                    .build()
                );
            }
        }
    }

    const loadBuilder = new LoadResultBuilder()
      .setTitle(title)
      .setUrl(url)
      .setApiName("movieboxProvider")
      .setType(type)
      .setPoster(data.cover?.url)
      .setBackgroundPoster(data.cover?.url)
      .setPlot(data.description)
      .setScore(parseFloat(data.imdbRatingValue));

    if (data.releaseDate?.substring(0, 4)) {
        loadBuilder.setYear(parseInt(data.releaseDate.substring(0, 4)));
    }
    if (data.duration) {
        loadBuilder.setDuration(data.duration);
    }
    if (data.genre) {
        loadBuilder.setGenres(data.genre.split(",").map((t: string) => t.trim()));
    }
    
    if (episodes.length > 0) {
        loadBuilder.addEpisodes(episodes);
    }

    return loadBuilder.build();
  },

  async loadLinks(data: string) {
    const { brand, model } = randomBrandModel();
    const parts = data.replace("moviebox://", "").split("|");
    let originalSubjectId = parts[0];
    if (originalSubjectId.includes("get?subjectId")) {
      const match = /subjectId=([^&]+)/.exec(originalSubjectId);
      if (match) originalSubjectId = match[1];
      else originalSubjectId = originalSubjectId.split('/').pop() || originalSubjectId;
    } else if (originalSubjectId.includes("/")) {
      originalSubjectId = originalSubjectId.split('/').pop() || originalSubjectId;
    }
    const season = parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
    const episode = parts.length > 2 ? parseInt(parts[2]) || 0 : 0;
    const subjectUrl = `${mainUrl}/wefeed-mobile-bff/subject-api/get?subjectId=${originalSubjectId}`;
    const subjectXClientToken = generateXClientToken();
    const subjectXTrSignature = generateXTrSignature("GET", "application/json", "application/json", subjectUrl);
    const subjectHeaders = {
        "user-agent": `com.community.oneroom/50020088 (Linux; U; Android 13; en_US; ${brand}; Build/TQ3A.230901.001; Cronet/145.0.7582.0)`,
        "accept": "application/json",
        "content-type": "application/json",
        "connection": "keep-alive",
        "x-client-token": subjectXClientToken,
        "x-tr-signature": subjectXTrSignature,
        "x-client-info": `{"package_name":"com.community.oneroom","version_name":"3.0.13.0325.03","version_code":50020088,"os":"android","os_version":"13","install_ch":"ps","device_id":"${deviceId}","install_store":"ps","gaid":"1b2212c1-dadf-43c3-a0c8-bd6ce48ae22d","brand":"${model}","model":"${brand}","system_language":"en","net":"NETWORK_WIFI","region":"US","timezone":"Asia/Calcutta","sp_code":"","X-Play-Mode":"1","X-Idle-Data":"1","X-Family-Mode":"0","X-Content-Mode":"0"}`,
        "x-client-status": "0"
    };
    const subjectRes = await fetch(subjectUrl, { headers: subjectHeaders });
    const subjectIds: { subjectId: string, language: string }[] = [];
    let originalLanguageName = "Original";
    let token = "";
    if (subjectRes.ok) {
        const subjectJson = await subjectRes.json();
        const dubs = subjectJson.data?.dubs;
        if (Array.isArray(dubs)) {
            for (const dub of dubs) {
                if (dub.subjectId && dub.lanName) {
                    if (dub.subjectId === originalSubjectId) {
                        originalLanguageName = dub.lanName;
                    } else {
                        subjectIds.push({ subjectId: dub.subjectId, language: dub.lanName });
                    }
                }
            }
        }
        const xUserHeader = subjectRes.headers.get("x-user");
        if (xUserHeader) {
            try {
                const xUserJson = JSON.parse(xUserHeader);
                token = xUserJson.token || "";
            } catch (e) {}
        }
    }
    subjectIds.unshift({ subjectId: originalSubjectId, language: originalLanguageName });
    const streamResultBuilder = new StreamResultBuilder();
    for (const { subjectId, language } of subjectIds) {
        try {
            const url = `${mainUrl}/wefeed-mobile-bff/subject-api/play-info?subjectId=${subjectId}&se=${season}&ep=${episode}`;
            const xClientToken = generateXClientToken();
            const xTrSignature = generateXTrSignature("GET", "application/json", "application/json", url);
            
            const headers: Record<string, string> = {
                "user-agent": `com.community.oneroom/50020088 (Linux; U; Android 13; en_US; ${brand}; Build/TQ3A.230901.001; Cronet/145.0.7582.0)`,
                "accept": "application/json",
                "content-type": "application/json",
                "connection": "keep-alive",
                "x-client-token": xClientToken,
                "x-tr-signature": xTrSignature,
                "x-client-info": `{"package_name":"com.community.oneroom","version_name":"3.0.13.0325.03","version_code":50020088,"os":"android","os_version":"13","install_ch":"ps","device_id":"${deviceId}","install_store":"ps","gaid":"1b2212c1-dadf-43c3-a0c8-bd6ce48ae22d","brand":"${model}","model":"${brand}","system_language":"en","net":"NETWORK_WIFI","region":"US","timezone":"Asia/Calcutta","sp_code":"","X-Play-Mode":"1","X-Idle-Data":"1","X-Family-Mode":"0","X-Content-Mode":"0"}`,
                "x-client-status": "0"
            };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(url, { headers });
            if (res.ok) {
                const json = await res.json();
                const playData = json.data;
                const playStreams = playData?.streams;
                if (Array.isArray(playStreams) && playStreams.length > 0) {
                    for (const stream of playStreams) {
                        const streamUrl = stream.url;
                        if (!streamUrl) continue;             
                        const format = stream.format || "";
                        const resolutions = stream.resolutions || "";
                        const signCookie = stream.signCookie || null;
                        const qualityNum = resolutions.includes("2160") ? 2160 :
                                         resolutions.includes("1440") ? 1440 :
                                         resolutions.includes("1080") ? 1080 :
                                         resolutions.includes("720") ? 720 :
                                         resolutions.includes("480") ? 480 :
                                         resolutions.includes("360") ? 360 : 0;
                        const isM3u8 = format.toLowerCase() === "hls" || streamUrl.split('.').pop()?.toLowerCase() === "m3u8";
                        const streamHeaders: Record<string, string> = { "Referer": mainUrl };
                        if (signCookie) {
                            streamHeaders["Cookie"] = signCookie;
                        }
                        streamResultBuilder.addStream(
                            new StreamBuilder()
                                .setTitle(`${language.replace("dub", "Audio")} - ${qualityNum ? qualityNum + 'p' : 'Auto'}`)
                                .setUrl(streamUrl)
                                .setIsM3u8(isM3u8)
                                .setQuality(qualityNum)
                                .setHeaders(streamHeaders)
                                .build()
                        );
                    }
                } else {
                    const fallbackUrl = `${mainUrl}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`;
                    const fallbackHeaders = { ...headers, "x-tr-signature": generateXTrSignature("GET", "application/json", "application/json", fallbackUrl) };
                    const fallbackRes = await fetch(fallbackUrl, { headers: fallbackHeaders });
                    if (fallbackRes.ok) {
                        const fallbackJson = await fallbackRes.json();
                        const detectors = fallbackJson.data?.resourceDetectors;
                        if (Array.isArray(detectors)) {
                            for (const detector of detectors) {
                                if (Array.isArray(detector.resolutionList)) {
                                    for (const video of detector.resolutionList) {
                                        const link = video.resourceLink;
                                        if (!link) continue;
                                        const quality = video.resolution || 0;
                                        streamResultBuilder.addStream(
                                            new StreamBuilder()
                                                .setTitle(`${language.replace("dub", "Audio")} - ${quality ? quality + 'p' : 'Auto'}`)
                                                .setUrl(link)
                                                .setIsM3u8(link.includes(".m3u8"))
                                                .setQuality(typeof quality === "number" ? quality : parseInt(quality.toString()) || 0)
                                                .setHeaders({ "Referer": mainUrl })
                                                .build()
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error(subjectId, e);
        }
    }
    return streamResultBuilder.build();
  }
});
