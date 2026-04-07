import type { NextConfig } from "next";
import { getSupabaseImageHost } from "./lib/supabase/config";

const supabaseHost = getSupabaseImageHost();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
