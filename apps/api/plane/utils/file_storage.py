import boto3
from botocore.config import Config
from django.conf import settings


def get_s3_client(endpoint_url: str | None = None):
    resolved_endpoint_url = endpoint_url or getattr(settings, "AWS_S3_ENDPOINT_URL", None)

    region_name = getattr(settings, "AWS_S3_REGION_NAME", None) or getattr(settings, "AWS_REGION", None)
    if resolved_endpoint_url and not region_name:
        region_name = "auto"

    config_kwargs: dict = {"signature_version": "s3v4"}
    if resolved_endpoint_url:
        config_kwargs["s3"] = {"addressing_style": "path"}

    return boto3.client(
        "s3",
        endpoint_url=resolved_endpoint_url,
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=region_name,
        config=Config(**config_kwargs),
    )


def generate_presigned_url(key: str, expiration: int = 3600, method: str = "get_object"):
    client = get_s3_client()

    params: dict = {
        "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
        "Key": key,
    }

    if method == "put_object":
        params["ContentType"] = "application/octet-stream"

    return client.generate_presigned_url(method, Params=params, ExpiresIn=expiration)


def delete_file(key: str) -> None:
    client = get_s3_client()
    client.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
