import os
import sys
import json
import urllib.request
import urllib.error
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# Añadir soporte para variables de entorno .env si están disponibles
try:
    from dotenv import load_dotenv
    # Subir un nivel desde 'scripts' hasta 'automation'
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    load_dotenv(env_path)
except ImportError:
    pass

import sqlite3

# Ruta de la base de datos
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backend', 'pos_database.sqlite')

# Configuracion Correo
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465
SENDER_EMAIL = os.environ.get("EMAIL_USER")
SENDER_PASSWORD = os.environ.get("EMAIL_PASS")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL") or SENDER_EMAIL

def send_closure_email(totals, suggestions, recipient=None):
    email_to = recipient or OWNER_EMAIL
    if not SENDER_EMAIL or not SENDER_PASSWORD or not email_to:
        print("[!] Advertencia: Credenciales SMTP u OWNER_EMAIL no configuradas. No se enviará correo.")
        return

    subject = f"📊 Cierre Diario Completado - {datetime.now().strftime('%d/%m/%Y')}"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #1e3a5f;">Reporte de Cierre Diario</h2>
        <p>El sistema POS ha ejecutado exitosamente el cierre del día.</p>
        
        <h3>Resumen Financiero:</h3>
        <ul>
            <li><strong>Ingresos Totales:</strong> ${totals.get('total_revenue', 0):.2f}</li>
            <li><strong>Costo Total:</strong> ${totals.get('total_cost', 0):.2f}</li>
            <li style="color: #16a34a; font-size: 1.1em;"><strong>Ganancia Bruta:</strong> ${totals.get('gross_profit', 0):.2f}</li>
        </ul>

        <h3>Sugerencias de Distribución de Ganancias:</h3>
        <ul style="list-style-type: none; padding-left: 0;">
            <li style="background: #e0f2fe; padding: 10px; margin-bottom: 5px; border-left: 4px solid #0284c7;">
                <strong>Reinvertir en el negocio (80%):</strong> ${suggestions.get('reinvestment', 0):.2f}
            </li>
            <li style="background: #dcfce7; padding: 10px; border-left: 4px solid #16a34a;">
                <strong>Retiro sugerido (20%):</strong> ${suggestions.get('withdrawal', 0):.2f}
            </li>
        </ul>
        <hr />
        <p style="font-size: 0.8em; color: #777;">Sistema de Automatización POS</p>
      </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg['Subject'] = subject
    msg['From'] = SENDER_EMAIL
    msg['To'] = email_to
    
    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, email_to, msg.as_string())
        server.quit()
        print(f"[+] Correo de reporte de cierre enviado exitosamente a {email_to}.")
    except Exception as e:
        print(f"[-] Error enviando el correo: {e}")

def main():
    print(f"--- Ejecutando Cierre Diario: {datetime.now()} ---")
    
    if not os.path.exists(DB_PATH):
        print(f"[-] Base de datos no encontrada en {DB_PATH}")
        sys.exit(1)
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Obtener el correo del administrador de la base de datos si no está en OWNER_EMAIL
    recipient = OWNER_EMAIL
    if not recipient:
        cursor.execute("SELECT email FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1")
        row = cursor.fetchone()
        if row:
            recipient = row[0]

    # Calcular ventas de hoy
    cursor.execute("""
        SELECT 
            IFNULL(SUM(total_revenue), 0) as total_revenue,
            IFNULL(SUM(total_cost), 0) as total_cost,
            IFNULL(SUM(gross_profit), 0) as gross_profit
        FROM sales 
        WHERE date(created_at, 'localtime') = date('now', 'localtime')
    """)
    res = cursor.fetchone()
    totals = {
        'total_revenue': res[0] or 0,
        'total_cost': res[1] or 0,
        'gross_profit': res[2] or 0
    }
    
    profit = totals['gross_profit']
    suggestions = {
        'withdrawal': profit * 0.20,
        'reinvestment': profit * 0.80
    }
    
    # Guardar cierre en BD si no existía hoy
    try:
        cursor.execute("""
            INSERT INTO daily_closures (date, total_revenue, total_cost, gross_profit, suggested_withdrawal, suggested_reinvestment)
            VALUES (date('now', 'localtime'), ?, ?, ?, ?, ?)
        """, (totals['total_revenue'], totals['total_cost'], totals['gross_profit'], suggestions['withdrawal'], suggestions['reinvestment']))
        conn.commit()
        print("[+] Cierre diario guardado exitosamente en la base de datos.")
    except sqlite3.IntegrityError:
        print("[!] El cierre diario de hoy ya existía previamente en la base de datos.")
    except Exception as e:
        print(f"[-] Error al guardar en BD: {e}")
    
    conn.close()
    
    # Enviar reporte por correo
    send_closure_email(totals, suggestions, recipient)

if __name__ == "__main__":
    main()
