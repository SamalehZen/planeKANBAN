import os
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from django.core.management import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "Configure CORS on the S3/R2 bucket to allow browser uploads"

    def add_arguments(self, parser):
        parser.add_argument(
            "--origins",
            type=str,
            nargs="*",
            help="Allowed origins (e.g., https://example.com). If not provided, uses WEB_URL and ADMIN_BASE_URL from settings.",
        )

    def get_s3_client(self):
        return boto3.client(
            "s3",
            endpoint_url=os.environ.get("AWS_S3_ENDPOINT_URL"),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
            region_name=os.environ.get("AWS_REGION", "auto"),
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def handle(self, *args, **options):
        bucket_name = os.environ.get("AWS_S3_BUCKET_NAME")

        if not bucket_name:
            self.stdout.write(self.style.ERROR("AWS_S3_BUCKET_NAME environment variable is not set."))
            return

        origins = options.get("origins") or []
        if not origins:
            web_url = os.environ.get("WEB_URL") or getattr(settings, "APP_BASE_URL", None)
            admin_url = os.environ.get("ADMIN_BASE_URL") or getattr(settings, "ADMIN_BASE_URL", None)
            space_url = os.environ.get("SPACE_BASE_URL") or getattr(settings, "SPACE_BASE_URL", None)
            
            if web_url:
                origins.append(web_url.rstrip("/"))
            if admin_url:
                origins.append(admin_url.rstrip("/"))
            if space_url:
                origins.append(space_url.rstrip("/"))

        if not origins:
            self.stdout.write(self.style.ERROR(
                "No origins provided. Set WEB_URL, ADMIN_BASE_URL environment variables or use --origins flag."
            ))
            return

        origins = list(set(filter(None, origins)))
        self.stdout.write(f"Configuring CORS for bucket '{bucket_name}' with origins: {origins}")

        cors_configuration = {
            "CORSRules": [
                {
                    "AllowedHeaders": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    "AllowedOrigins": origins,
                    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
                    "MaxAgeSeconds": 3600,
                }
            ]
        }

        try:
            s3_client = self.get_s3_client()
            s3_client.put_bucket_cors(Bucket=bucket_name, CORSConfiguration=cors_configuration)
            self.stdout.write(self.style.SUCCESS(f"CORS configured successfully for bucket '{bucket_name}'"))
            self.stdout.write(self.style.SUCCESS(f"Allowed origins: {origins}"))
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_message = e.response.get("Error", {}).get("Message", str(e))
            self.stdout.write(self.style.ERROR(f"Failed to configure CORS: [{error_code}] {error_message}"))
            
            if "NotImplemented" in str(e) or error_code == "NotImplemented":
                self.stdout.write(self.style.WARNING(
                    "\nCloudflare R2 may not support CORS configuration via API.\n"
                    "Please configure CORS manually in Cloudflare Dashboard:\n"
                    "1. Go to R2 > Your Bucket > Settings > CORS Policy\n"
                    "2. Add the following configuration:\n"
                ))
                import json
                cors_json = [
                    {
                        "AllowedOrigins": origins,
                        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                        "AllowedHeaders": ["*"],
                        "ExposeHeaders": ["ETag"],
                        "MaxAgeSeconds": 3600,
                    }
                ]
                self.stdout.write(json.dumps(cors_json, indent=2))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Unexpected error: {e}"))
