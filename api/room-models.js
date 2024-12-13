import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!id) {
    return res.status(400).json({ error: "Room ID is required" });
  }

  try {
    const { data: models, error } = await supabase
      .from("roommodels")
      .select("model_id, models (name, description, model_image, company)")
      .eq("room_id", id);

    if (error || !models) {
      throw error || new Error("Models not found for the specified room");
    }

    res.status(200).json(models);
  } catch (error) {
    console.error("Error fetching room models:", error);
    res.status(500).json({ error: "Failed to fetch room models" });
  }
}
