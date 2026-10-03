"""
Script: attendance_notifier.py
Descripción: Envía un correo electrónico al dueño cuando un trabajador 
             marca entrada o salida en el sistema POS.

Uso (llamado desde Node.js):
  python attendance_notifier.py --name "Juan Pérez" --event "clock_in" --time "08:05:23"
"""

import smtplib
import argparse
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import dotenv_values

# Cargamos las variables de entorno del archivo .env
config = dotenv_values(os.path.join(os.path.dirname(__file__), '../.env'))

SMTP_SERVER   = config.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT     = int(config.get("SMTP_PORT", 587))
SENDER_EMAIL  = config.get("SENDER_EMAIL", "")
SENDER_PASS   = config.get("SENDER_PASS", "")
OWNER_EMAIL   = config.get("OWNER_EMAIL", "")


def send_attendance_email(worker_name: str, event: str, event_time: str):
    """
    Envía el email de notificación al dueño.
    """
    if not all([SENDER_EMAIL, SENDER_PASS, OWNER_EMAIL]):
        print("AVISO: Faltan credenciales de correo en .env. El email no fue enviado.")
        return

    # Construimos el mensaje según el tipo de evento
    if event == "clock_in":
        subject   = f"✅ Entrada registrada — {worker_name}"
        action    = "marcó su ENTRADA"
        color     = "#16a34a"
        emoji     = "🟢"
    else:
        subject   = f"🔴 Salida registrada — {worker_name}"
        action    = "marcó su SALIDA"
        color     = "#dc2626"
        emoji     = "🔴"

    # Cuerpo del email en HTML para que se vea bonito
    html_body = f"""
    <html><body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
      <div style="max-width: 500px; margin: auto; background: white; border-radius: 12px; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background: {color}; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 1.5rem;">{emoji} Sistema POS</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0.5rem 0 0;">Notificación de Asistencia</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 1.1rem; color: #0f172a;">
            El trabajador <strong>{worker_name}</strong> {action}.
          </p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 12px; margin-top: 1rem;">
            <p style="margin: 0; color: #475569;"><strong>⏰ Hora:</strong> {event_time}</p>
            <p style="margin: 0.5rem 0 0; color: #475569;">
              <strong>📅 Fecha:</strong> {datetime.now().strftime('%A, %d de %B de %Y')}
            </p>
          </div>
          <p style="margin-top: 1.5rem; color: #94a3b8; font-size: 0.85rem; text-align: center;">
            Este es un mensaje automático del Sistema POS.
          </p>
        </div>
      </div>
    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = SENDER_EMAIL
    msg["To"]      = OWNER_EMAIL
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASS)
            server.sendmail(SENDER_EMAIL, OWNER_EMAIL, msg.as_string())
        print(f"Email enviado exitosamente a {OWNER_EMAIL}")
    except Exception as e:
        print(f"Error al enviar email: {e}")


if __name__ == "__main__":
    # Leemos los argumentos que nos pasa Node.js por la línea de comandos
    parser = argparse.ArgumentParser(description="Notificador de asistencia POS")
    parser.add_argument("--name",  required=True, help="Nombre del trabajador")
    parser.add_argument("--event", required=True, choices=["clock_in", "clock_out"], help="Tipo de evento")
    parser.add_argument("--time",  required=True, help="Hora del evento")
    args = parser.parse_args()

    send_attendance_email(args.name, args.event, args.time)
