const {rateLimit} = require("express-rate-limit");

const globalLimiter = rateLimit({
	windowMs: 10 * 60 * 1000, // 10 minutes
	limit: 500, // Limit each IP to 500 requests per `window` (here, per 10 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers 
	handler: (req, res, next, options) => {
    const retryAfter = Math.ceil(Number.parseInt(res.getHeaders()["retry-after"])/60);
	
    res.status(429).json({
      code: 'LIMIT_EXCEEDED', 
      message: `You have sent too many requests, Please wait ${retryAfter} minutes before trying again`,
    });
  },
})

const otpLimiter = rateLimit({
	windowMs: 10 * 60 * 1000, // 10 minutes
	limit: 1, // Limit each IP to 11 requests per `window` (here, per 10 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	handler: (req, res, next, options) => {
    const retryAfter = Math.ceil(Number.parseInt(res.getHeaders()["retry-after"])/60);
	
    res.status(429).json({
      code: 'LIMIT_EXCEEDED', 
      message: `Please wait ${retryAfter} minutes before generating another OTP`,
    });
  },
	
})

module.exports = {globalLimiter, otpLimiter}