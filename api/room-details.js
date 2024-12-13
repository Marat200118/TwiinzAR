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
    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !room) {
      throw error || new Error("Room not found");
    }

    res.status(200).json(room);
  } catch (error) {
    console.error("Error fetching room details:", error);
    res.status(500).json({ error: "Failed to fetch room details" });
  }
}
