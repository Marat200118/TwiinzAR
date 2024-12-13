import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Model ID is required." });
  }

  try {
    const { data, error } = await supabase
      .from("models")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Model not found." });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching model:", error);
    res.status(500).json({ error: "Internal Server Error." });
  }
}
