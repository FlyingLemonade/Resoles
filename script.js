$(document).ready(function () {
  const socket = io("http://localhost:3000", {
    query: {},
  });

  $("#submit").on("click", (e) => {
    e.preventDefault();
    const promptValue = $("#prompt").val();
    $("#prompt").val("");
    if (promptValue.trim() === "") {
      return;
    }

    $("#chat").val("Loading...");
    $("#summary").val("Loading...");
    socket.emit("askToAI", {
      prompt: promptValue,
    });
  });

  socket.on("responseFromAI", ({ response, textSummary }) => {
    const sanitizedResponse = response.replace(/\*/g, "");
    const sanitizedSummary = textSummary.replace(/\*/g, "");
    console.log(sanitizedResponse);
    if (sanitizedResponse !== "") {
      $("#chat").val(sanitizedResponse);
    }
    if (sanitizedSummary !== "") {
      $("#summary").val(sanitizedSummary);
    }
  });
});
