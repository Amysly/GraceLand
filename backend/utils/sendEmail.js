const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {

  const { data, error } = await resend.emails.send({
    from: "Graceland Theological Seminary Admission Board <onboarding@resend.dev>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

module.exports = sendEmail;