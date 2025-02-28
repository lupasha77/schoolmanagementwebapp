# # app/utils/emails.py
# from flask_mail import Mail, Message
# from flask import render_template_string
# import logging
# from flask import current_app
# mail = Mail()

# def init_mail(app):
#     try:
#         mail.init_app(app)
#         logging.info("Mail system initialized successfully")
#     except Exception as e:
#         logging.error(f"Failed to initialize mail system: {e}")

# def send_verification_email(email, username, token):
#     try:
#         verification_url = f"{current_app.config['FRONTEND_URL']}/verify-email/{token}"
#         html_content = f"""
#         <h2>Welcome {username}!</h2>
#         <p>Thank you for registering. Please verify your email by clicking the link below:</p>
#         <a href="{verification_url}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
#             Verify Email
#         </a>
#         <p>Or copy this link: {verification_url}</p>
#         <p>This link will expire in 24 hours.</p>
#         """
        
#         msg = Message(
#             'Verify Your Email Address',
#             recipients=[email],
#             html=html_content
#         )
#         mail.send(msg)
#         logging.info(f"Verification email sent to {email}")
#         return True
#     except Exception as e:
#         logging.error(f"Failed to send verification email: {e}")
#         return False

 