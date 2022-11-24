# Stage 1 - Install build dependencies
FROM python:3.9.15 AS builder
WORKDIR /app
COPY . .
RUN python -m venv .venv && .venv/bin/pip install --no-cache-dir -U pip setuptools
RUN .venv/bin/pip install --no-cache-dir -r requirements.txt && find /app/.venv \( -type d -a -name test -o -name tests \) -o \( -type f -a -name '*.pyc' -o -name '*.pyo' \) -exec rm -rf '{}' \+

# Stage 2 - Copy only necessary files to the runtime stage
FROM python:3.9.15-alpine
WORKDIR /app
COPY --from=builder /app /app
ENV PATH="/app/.venv/bin:$PATH"
ENV APP_ENV="PROD"
ENV APP_PORT=8080
ENV APP_CORS="*"
EXPOSE $APP_PORT
CMD ["python", "app.py"]
