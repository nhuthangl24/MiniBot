import mongoose from "mongoose";
import { connectToDatabase } from "./lib/db.ts";

async function main() {
  await connectToDatabase();
  const Hosting = mongoose.models.Hosting;
  const docs = await Hosting.find();
  docs.forEach(d => console.log(d._id, d.sourcePath));
  process.exit(0);
}
main();
