import { Router, Response } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db/index.ts";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.ts";

export const chatRouter = Router();

// GET /api/v1/chat/conversations
chatRouter.get("/conversations", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const result = await db.query(
      `SELECT c.*,
              sr.title as request_title,
              c_user.full_name as client_name, c_user.avatar_url as client_avatar,
              p_user.full_name as pro_name, p_user.avatar_url as pro_avatar,
              (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.read = FALSE) as unread_count
       FROM conversations c
       LEFT JOIN service_requests sr ON c.request_id = sr.id
       JOIN users c_user ON c.client_id = c_user.id
       JOIN users p_user ON c.professional_id = p_user.id
       WHERE c.client_id = $1 OR c.professional_id = $1
       ORDER BY c.last_message_at DESC;`,
      [user.id]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: "Error al cargar conversaciones" });
  }
});

// GET /api/v1/chat/conversations/:id/messages
chatRouter.get("/conversations/:id/messages", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Check conversation access
    const conv = await db.query("SELECT * FROM conversations WHERE id = $1;", [id]);
    if (conv.rows.length === 0) {
      res.status(404).json({ error: "Conversación no encontrada" });
      return;
    }

    if (user.role !== "admin" && conv.rows[0].client_id !== user.id && conv.rows[0].professional_id !== user.id) {
      res.status(403).json({ error: "No tienes permiso para ver esta conversación" });
      return;
    }

    const messages = await db.query(
      `SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC;`,
      [id]
    );

    // Mark unread messages as read
    await db.query(
      "UPDATE messages SET read = TRUE WHERE conversation_id = $1 AND sender_id != $2 AND read = FALSE;",
      [id, user.id]
    );

    res.json(messages.rows);
  } catch (error: any) {
    res.status(500).json({ error: "Error al cargar mensajes" });
  }
});

// POST /api/v1/chat/conversations/:id/messages
chatRouter.post("/conversations/:id/messages", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { content, messageType, metadata } = req.body;

    if (typeof content !== "string" || !content.trim()) {
      res.status(400).json({ error: "El mensaje no puede estar vacío" });
      return;
    }

    // Check participation
    const conv = await db.query("SELECT * FROM conversations WHERE id = $1;", [id]);
    if (conv.rows.length === 0) {
      res.status(404).json({ error: "Conversación no encontrada" });
      return;
    }

    if (user.role !== "admin" && conv.rows[0].client_id !== user.id && conv.rows[0].professional_id !== user.id) {
      res.status(403).json({ error: "No eres participante de esta conversación" });
      return;
    }

    const messageId = "msg_" + randomUUID();

    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO messages (id, conversation_id, sender_id, message_type, content, metadata)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [messageId, id, user.id, messageType || "text", content.trim(), metadata ? JSON.stringify(metadata) : null]
      );

      await tx.query("UPDATE conversations SET last_message_at = NOW() WHERE id = $1;", [id]);
    });

    res.status(201).json({
      message: "Mensaje enviado exitosamente",
      messageId
    });
  } catch (error: any) {
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
});
