// Per-lander + daily conversions from OpenPanel's first-touch attribution
// (breakdown = properties.first_touch_landing_page), summed over the SEO landers.
// OpenPanel's key-based export API cannot run this breakdown and its report API
// is cookie-only, so the Vercel server cannot fetch it live. This is a dated
// snapshot pulled from OpenPanel's own reports; refresh by re-pulling on request.

// Daily SEO-page registrations + subscriptions, 2026-05-18 .. 2026-08-18 (year 2026).
const DAILY_RAW =
  "05-18,0,0;05-19,0,0;05-20,0,0;05-21,0,0;05-22,0,0;05-23,0,0;05-24,0,0;05-25,0,0;05-26,0,0;05-27,0,0;05-28,0,0;05-29,0,0;05-30,0,0;05-31,0,0;06-01,0,0;06-02,0,0;06-03,0,0;06-04,0,0;06-05,0,0;06-06,0,0;06-07,0,0;06-08,0,0;06-09,0,0;06-10,0,0;06-11,0,0;06-12,0,0;06-13,0,0;06-14,0,0;06-15,0,0;06-16,0,0;06-17,0,0;06-18,0,0;06-19,0,0;06-20,0,0;06-21,0,0;06-22,0,0;06-23,0,0;06-24,0,0;06-25,0,0;06-26,0,0;06-27,0,0;06-28,0,0;06-29,0,0;06-30,0,0;07-01,0,0;07-02,0,0;07-03,0,0;07-04,0,0;07-05,0,0;07-06,0,0;07-07,0,0;07-08,0,0;07-09,0,0;07-10,0,0;07-11,0,0;07-12,0,0;07-13,0,0;07-14,0,0;07-15,0,0;07-16,0,0;07-17,0,0;07-18,0,0;07-19,0,0;07-20,0,0;07-21,0,0;07-22,0,0;07-23,0,0;07-24,0,0;07-25,0,0;07-26,0,0;07-27,0,0;07-28,1,0;07-29,8,0;07-30,21,0;07-31,15,0;08-01,12,0;08-02,16,0;08-03,21,0;08-04,14,1;08-05,15,2;08-06,14,0;08-07,19,0;08-08,17,2;08-09,32,1;08-10,27,0;08-11,21,0;08-12,19,0;08-13,25,1;08-14,21,0;08-15,21,1;08-16,19,0;08-17,17,2;08-18,24,1";

export const OP_SNAPSHOT = {
  asOf: "2026-08-18",
  window: "30d",
  source: "OpenPanel first-touch (properties.first_touch_landing_page)",
  perLander: {
    "gay-ai": { signups: 120, subs: 5, revenue: 275.73 },
    "sissy-ai": { signups: 71, subs: 1, revenue: 7.99 },
    "ai-hentai": { signups: 45, subs: 0, revenue: 0 },
    "cuckold-ai": { signups: 45, subs: 0, revenue: 0 },
    "ai-joi": { signups: 40, subs: 1, revenue: 7.99 },
    "futanari-ai": { signups: 24, subs: 0, revenue: 0 },
    "best-ai-roleplay-chat": { signups: 8, subs: 1, revenue: 19.99 },
    "ai-boobs": { signups: 6, subs: 0, revenue: 0 },
    "shemale-ai": { signups: 6, subs: 0, revenue: 0 },
    "ai-anal": { signups: 5, subs: 0, revenue: 0 },
    "twink-ai": { signups: 5, subs: 1, revenue: 7.99 },
    "hotwife-ai": { signups: 5, subs: 1, revenue: 119.88 },
    "ai-pussy": { signups: 4, subs: 0, revenue: 0 },
    "femdom-ai": { signups: 4, subs: 0, revenue: 0 },
    "fetish-ai": { signups: 3, subs: 0, revenue: 0 },
    "milf-ai": { signups: 3, subs: 0, revenue: 0 },
    "yandere-ai-girlfriend-simulator": { signups: 2, subs: 0, revenue: 0 },
    "ai-fantasy": { signups: 2, subs: 1, revenue: 19.99 },
    "ai-blowjob": { signups: 2, subs: 0, revenue: 0 },
    "talk-to-ai-girlfriend": { signups: 1, subs: 0, revenue: 0 },
    "replika-ai-girlfriend-review": { signups: 1, subs: 0, revenue: 0 },
    "furry-ai": { signups: 1, subs: 0, revenue: 0 },
    "ai-cumshot": { signups: 1, subs: 0, revenue: 0 },
    "mistress-ai": { signups: 1, subs: 0, revenue: 0 },
    "ntr-ai": { signups: 1, subs: 0, revenue: 0 },
    "trans-ai": { signups: 1, subs: 0, revenue: 0 },
    "bi-cuckold-ai": { signups: 1, subs: 1, revenue: 19.99 },
  },
  daily: DAILY_RAW.split(";").map((r) => {
    const p = r.split(",");
    return { date: "2026-" + p[0], regs: Number(p[1]), subs: Number(p[2]) };
  }),
};
