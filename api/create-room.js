import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .insert({})
        .select("id")
        .single();

      if (error) {
        console.error("Error creating room:", error);
        return res.status(500).json({ error: "Failed to create a room." });
      }

      res.status(200).json({ id: data.id });
    } catch (err) {
      console.error("Unexpected error:", err);
      res.status(500).json({ error: "Unexpected server error." });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
