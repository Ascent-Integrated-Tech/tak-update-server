import React, { useState } from 'react';

function UploadForm({ token, onUploadSuccess }) {
    const [device, setDevice] = useState('TAB');

    const handleDeviceChange = (event) => {
        setDevice(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);

        const response = await fetch(`/${device}/upload?token=${token}`, {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            onUploadSuccess();
        }
    };

    return (
        <form method="POST" encType="multipart/form-data" onSubmit={handleSubmit}>
            <label htmlFor="device">Target Hardware:</label>
            <select name="device" id="device" value={device} onChange={handleDeviceChange}>
                <option value="TAB">Tablet</option>
                <option value="PHN">Phone</option>
            </select>
            <input type="file" name="plugin" />
            <input type="submit" value="Upload" />
        </form>
    );
}

export default UploadForm;
