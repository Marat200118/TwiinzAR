import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    room_id,
    room_name,
    created_by_name,
    creators_age,
    created_by_phone,
    inspiration,
    models,
  } = req.body;

  if (!room_id || !room_name || !models || models.length === 0) {
    return res
      .status(400)
      .json({ error: "Invalid request: missing required fields" });
  }

  try {
   
    const { error: roomError } = await supabase
      .from("rooms")
      .update({
        room_name,
        created_by_name,
        creators_age,
        created_by_phone,
        inspiration,
      })
      .eq("id", room_id);

    if (roomError) {
      console.error("Error updating room:", roomError);
      return res.status(500).json({ error: "Failed to update room" });
    }

    const { error: modelsError } = await supabase.from("roommodels").insert(
      models.map((model) => ({
        room_id,
        model_id: model.model_id,
        position: model.position,
        rotation: model.rotation,
        scale: model.scale,
      }))
    );

    if (modelsError) {
      console.error("Error inserting models:", modelsError);
      return res.status(500).json({ error: "Failed to insert models" });
    }

    res.status(200).json({ message: "Room submitted successfully" });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
