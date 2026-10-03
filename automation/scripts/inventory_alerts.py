"""
Script: inventory_alerts.py
Descripción: Envía un correo al dueño cuando el stock de un producto
             cae por debajo del nivel mínimo configurado.

Uso (llamado desde Node.js):
  python inventory_alerts.py --product "Jamón Serrano" --stock 0.5 --min 1.0
"""

import smtplib
import argparse
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import dotenv_values

config = dotenv_values(os.path.join(os.path.dirname(__file__), '../.env'))

SMTP_SERVER  = config.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT    = int(config.get("SMTP_PORT", 587))
SENDER_EMAIL = config.get("SENDER_EMAIL", "")
SENDER_PASS  = config.get("SENDER_PASS", "")
OWNER_EMAIL  = config.get("OWNER_EMAIL", "")


def send_stock_alert(product_name: str, current_stock: str, min_stock: str):
    if not all([SENDER_EMAIL, SENDER_PASS, OWNER_EMAIL]):
        print("AVISO: Faltan credenciales en .env. El email no fue enviado.")
        return

    stock_val = float(current_stock)
    min_val   = float(min_stock)
    
    # Si el stock llegó a cero, es crítico
    is_empty  = stock_val <= 0
    level_txt = "AGOTADO ❌" if is_empty else f"BAJO ({stock_val})"
    color     = "#7f1d1d" if is_empty else "#92400e"
    bg_color  = "#fef2f2" if is_empty else "#fffbeb"
    emoji     = "🚨" if is_empty else "⚠️"

    subject = f"{emoji} Alerta de Stock — {product_name} ({level_txt})"

    html_body = f"""
    <html><body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
      <div style="max-width: 520px; margin: auto; background: white; border-radius: 12px; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background: {color}; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 1.5rem;">{emoji} Alerta de Inventario</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 0.5rem 0 0;">Sistema POS — Acción Requerida</p>
        </div>
        <div style="padding: 24px; background: {bg_color};">
          <p style="font-size: 1.15rem; color: #1e293b;">
            El producto <strong style="color: {color};">"{product_name}"</strong> requiere atención inmediata.
          </p>
          <div style="background: white; border-radius: 8px; padding: 16px; margin-top: 1rem; 
                      border-left: 4px solid {color};">
            <p style="margin: 0; font-size: 1rem;"><strong>📦 Stock Actual:</strong> 
              <span style="color: {color}; font-weight: 700;">{stock_val}</span></p>
            <p style="margin: 0.5rem 0 0; font-size: 1rem;"><strong>📉 Nivel Mínimo:</strong> {min_val}</p>
            <p style="margin: 0.5rem 0 0; font-size: 1rem;"><strong>📋 Estado:</strong> 
              <span style="color: {color}; font-weight: 700;">{level_txt}</span></p>
          </div>
          <p style="margin-top: 1.5rem; font-weight: 600; color: #1e293b;">
            👉 Por favor, reponga este producto lo antes posible.
          </p>
        </div>
        <div style="padding: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 0.8rem;">
            Alerta automática enviada el {datetime.now().strftime('%d/%m/%Y a las %H:%M')}
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
        print(f"Alerta de stock enviada exitosamente para '{product_name}'.")
    except Exception as e:
        print(f"Error al enviar alerta: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Alerta de inventario bajo")
    parser.add_argument("--product", required=True, help="Nombre del producto")
    parser.add_argument("--stock",   required=True, help="Stock actual")
    parser.add_argument("--min",     required=True, help="Nivel mínimo de stock")
    args = parser.parse_args()

    send_stock_alert(args.product, args.stock, args.min)
