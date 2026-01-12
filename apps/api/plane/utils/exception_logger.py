# Python imports
import logging
import traceback
import sys

# Django imports
from django.conf import settings

diag_logger = logging.getLogger("plane.diagnostic")


def log_exception(e, warning=False, request=None):
    logger = logging.getLogger("plane.exception")

    exc_type, exc_value, exc_tb = sys.exc_info()
    
    diag_logger.error("="*60)
    diag_logger.error(f"[EXCEPTION] Type: {type(e).__name__}")
    diag_logger.error(f"[EXCEPTION] Message: {str(e)}")
    
    if request:
        diag_logger.error(f"[EXCEPTION] Path: {request.path}")
        diag_logger.error(f"[EXCEPTION] Method: {request.method}")
        diag_logger.error(f"[EXCEPTION] User: {getattr(request.user, 'email', 'Anonymous') if hasattr(request, 'user') else 'N/A'}")
    
    tb_lines = traceback.format_exception(exc_type, exc_value, exc_tb)
    diag_logger.error(f"[EXCEPTION] Full Traceback:")
    for line in tb_lines:
        for subline in line.strip().split('\n'):
            diag_logger.error(f"[EXCEPTION]   {subline}")
    
    diag_logger.error("="*60)

    if warning:
        logger.warning(str(e))
    else:
        logger.exception(e)

    if settings.DEBUG:
        logger.debug(traceback.format_exc())
    return
