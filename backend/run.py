# run.py
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)

# from app import create_app
# import os

# # Determine environment
# env = os.getenv('FLASK_ENV', 'development')
# config_map = {
#     'development': 'app.config.DevelopmentConfig',
#     'production': 'app.config.ProductionConfig',
#     'testing': 'app.config.TestingConfig'
# }

# app = create_app(config_map.get(env))

# if __name__ == '__main__':
#     app.run(
#         host=os.getenv('FLASK_HOST', '0.0.0.0'),
#         port=int(os.getenv('FLASK_PORT', 5000)),
#         debug=env == 'development'
#     )