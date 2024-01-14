const express = require("express");
const app = express();
const http = require("http").Server(app);
const dotenv = require("dotenv");
dotenv.config();
const io = require("socket.io")(http, {
  cors: { origin: "*" },
});
const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} = require("@google/generative-ai");
const connectedSockets = [];
//Connect to Gemini
// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
var chatHistory = [];
async function run(prompt) {
  // For text-only input, use the gemini-pro model
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];

  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    safetySettings,
  });

  const chat = model.startChat({
    history: chatHistory,
    generationConfig: {
      maxOutputTokens: 500,
    },
  });
  console.log(prompt);
  const msg = `
  If this pertains to achieving goals through promise resolutions, commitment, and roadmaps:
   - Evaluate if the statement is too general; if so, specify areas that need more detail.
   - Assess if the goal is realistically achievable within a year.
   - In case you find the goal, provide a roadmap and estimate the required time.
   - If unsure about my capabilities or skills, feel free to inquire.
   - Ask for clarification if the prompt is unclear or request repetition if needed if this prompt is clear ignore this point.
   - Never repeat or quote my prompt.
   Otherwise, respond with 'Apologies, I couldn't find a clear resolution or answer within my current
   capabilities. If you have specific questions related to promises, resolutions, commitment, or roadmaps, please provide more spesific for a more accurate response.' Provide a concise answer.
   "Consider the following statement: 
  
  ${prompt}"`;
  const result = await chat.sendMessageStream(msg);
  const response = await result.response;
  const text = response.text();
  console.log(text);
  const messageRecordUser = {
    role: "user",
    parts: msg,
  };
  const messageRecordModel = {
    role: "model",
    parts: text,
  };
  chatHistory.push(messageRecordUser);
  chatHistory.push(messageRecordModel);

  // Generate Summary
  const prompt2 =
    text +
    `\nGenerate a concise summary of the given data.
    - If no significant information is present, respond with 'No Summary'.
    - Include detailed what should i do consistently every day and timelines for acquiring these skills.
    - Additionally, provide relevant links to courses or resources for learning the mentioned skills.
    - Never repeat or quote my prompt.`;
  const resultSummary = await chat.sendMessageStream(prompt2);
  const responseSummary = await resultSummary.response;
  const textSummary = await responseSummary.text();
  console.log(textSummary);

  // const textSummary = "hai";
  return { text, textSummary };
}

// Socket IO
io.on("connection", function (socket) {
  const userEmail = socket.handshake.query.email;
  const existingSocket = connectedSockets.find(
    (s) => s.user.email === userEmail
  );
  if (!existingSocket) {
    connectedSockets.push({
      socket,
      user: {
        email: userEmail,
      },
    });
  }

  function findSocketByEmail(email) {
    return connectedSockets.find((socket) => socket.user.email === email);
  }

  socket.on("askToAI", async ({ prompt }) => {
    const result = await run(prompt);

    //Need to be fixed for single user later
    socket.emit("responseFromAI", {
      response: result.text,
      textSummary: result.textSummary,
    });
  });

  socket.on("disconnect", function () {
    const index = connectedSockets.findIndex((s) => s.socket === socket);
    if (index !== -1) {
      connectedSockets.splice(index, 1);
      console.log("User Just Disconnected");
    }
  });
});

http.listen(3000);
