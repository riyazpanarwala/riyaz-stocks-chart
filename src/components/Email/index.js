const sendEmail = async () => {
  try {
    const response = await fetch("/api/Email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: "abcd@mailinator.com",
        subject: "test",
        text: "hey, how are you",
      }),
    });

    const result = await response.json();
    console.log(result);
  } catch (error) {
    console.error("Error sending email:", error);
    // alert("An error occurred while sending the email.");
  }
};

export default sendEmail;
