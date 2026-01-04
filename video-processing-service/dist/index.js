"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Step 1: "Buying the Franchise"
// We import the library that knows how to manage web servers and HTTP protocols.
const express_1 = __importDefault(require("express"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
// Step 2: "Creating the Branch Office"
// We create an instance of our server application. It now exists in the computer's memory.
const app = (0, express_1.default)();
app.use(express_1.default.json()); // Middleware to parse JSON bodies
app.get("/", (req, res) => {
    res.send("The server is alive and kicking!");
});
// We define what to do when a "call" (HTTP post Request) comes in.
// "If (app.get) someone asks for the root path (/), answer them (res.send) with a message."
// req contains information about the incoming request, like body.
// res is used to send back the desired response to the client.
app.post("/process-video", (req, res) => {
    // 1. Extract file paths from the parsed JSON body
    const inputFilePath = req.body.inputFilePath;
    const outputFilePath = req.body.outputFilePath; // Define output path
    // 2. Security check: Ensure both paths were provided by the user
    // if we dont send them res.send, the client will wait forever
    if (!inputFilePath || !outputFilePath) {
        return res.status(400).send("Input and output file paths are required.");
    }
    // 3. Start the FFmpeg engine with the input file
    (0, fluent_ffmpeg_1.default)(inputFilePath)
        // 4. Set processing instructions: Resize the video to 360p height
        .outputOptions("-vf", "scale=-1:360")
        // 5. Success Event: Runs only when the video is fully processed
        .on("end", () => {
        res.status(200).send("Processing finished successfully.");
    })
        // 6. Error Event: Runs if something goes wrong (e.g., file not found)
        .on("error", (err) => {
        console.error("Error processing video: ${err.message}");
        res.status(500).send("Internal server error: ${err.message}");
    })
        // 7. Execution: Tell FFmpeg to start working and save the result
        .save(outputFilePath);
});
// Steps 9-13: "Opening the Doors" (Listening State)
// This is the most crucial step. The server starts "Listening" on the TCP Socket.
// From this moment, the OS will route any traffic on port 3000 to this code.
// the process.env.Port allows the port to be set by the environment(cloud) (useful for deployment).
const port = process.env.PORT || 3000;
app.listen(port, () => {
    // This message confirms to us (the developers) that the "Pizzeria" is open for business.
    console.log(`Video Processing Service is running at http://localhost:${port}`);
});
