from app.auth import hash_password, verify_password


def test_hash_password_handles_72_byte_limit():
    password = "a" * 73
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True
