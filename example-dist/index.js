module.exports = {
  rofl: (event, context) => {
    console.log("event", event, context);
    return {
      statusCode: 410,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tjong: "kong",
      }),
    };
  },
};
