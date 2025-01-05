import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const connectDb = async () => {
    try {
        if (!MONGO_URI) {
            throw new Error("MONGO_URI is not defined");
        }

        await mongoose.connect(MONGO_URI);
    } catch (error) {
        console.log("Error connecting to MongoDB", error);
    }
};

// Event listeners for connection events
mongoose.connection.on("connected", () => {
    console.log("Mongoose connected to the database");
});

mongoose.connection.on("disconnected", () => {
    console.log("Mongoose disconnected from the database");
});

mongoose.connection.on("error", (err) => {
    console.error("Mongoose connection error:", err);
});

export { connectDb };
