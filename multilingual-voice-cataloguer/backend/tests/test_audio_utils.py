import os
import io
import pytest
from fastapi import UploadFile, HTTPException
from backend.utils.audio import validate_audio_file, cleanup_temp_file


def test_validate_audio_file_valid():
    file = UploadFile(filename="recording.wav", file=io.BytesIO(b"fake wav data"))
    # Should not raise
    validate_audio_file(file)

    file_mp3 = UploadFile(filename="voice.mp3", file=io.BytesIO(b"fake mp3 data"))
    validate_audio_file(file_mp3)

    file_webm = UploadFile(filename="blob.webm", file=io.BytesIO(b"fake webm data"))
    validate_audio_file(file_webm)


def test_validate_audio_file_invalid_extension():
    file = UploadFile(filename="malicious.exe", file=io.BytesIO(b"evil code"))
    with pytest.raises(HTTPException) as excinfo:
        validate_audio_file(file)
    assert excinfo.value.status_code == 400
    assert "Unsupported audio format" in excinfo.value.detail


def test_validate_audio_file_missing():
    with pytest.raises(HTTPException) as excinfo:
        validate_audio_file(None)
    assert excinfo.value.status_code == 400


def test_cleanup_temp_file():
    # Test cleanup of existing file
    temp_path = "temp_test_file.tmp"
    with open(temp_path, "w") as f:
        f.write("temporary test content")
    assert os.path.exists(temp_path)
    cleanup_temp_file(temp_path)
    assert not os.path.exists(temp_path)

    # Test non-existent file doesn't crash
    cleanup_temp_file("non_existent_file_xyz.tmp")
