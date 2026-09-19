window.PB_CONFIG = Object.freeze({
  version: "Beta 2.0",
  referralBackendUrl: "https://promptbuilder-email.paulborbon.workers.dev", // Public URL of the new referral backend; configure after deployment.
  backendUrl: "https://promptbuilder-backend.paulborbon.workers.dev",
  createdDate: "13 Sep 2026",
  updatedDate: "19 Sep 2026",
  endpoints: Object.freeze({
    referral: "/api/send-referral",
    support: "/api/support",
    feedback: "/api/feedback",
    siteReference: "/api/site-reference",
    referenceVote: "/api/reference-vote",
    referenceRatings: "/api/reference-ratings",
    referenceTestimonials: "/api/reference-testimonials",
    testimonials: "/api/testimonials",
    visitorCount: "/api/visitor-count",
    generateImage: "/api/ai/generate-image",
    translateDialogue: "/api/ai/translate-dialogue"
  })
});
