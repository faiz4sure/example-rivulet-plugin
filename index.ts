import { servePlugins } from "jsr:@rivulet/sdk";
import dummyProvider from "./providers/dummyProvider.ts";
import movieboxProvider from "./providers/movieboxProvider.ts";


servePlugins([dummyProvider, movieboxProvider]);
