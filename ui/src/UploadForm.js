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

    const hashPassword = async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleDownload = async (event) => {
        event.preventDefault();
        
        const correctHash = '00390de2b7074071bb6494e818e84884ef6331ceb0b1e70948bde3ef4ba57b92';
        const userPassword = prompt('Please enter the password to download the certificate:');
        
        if (userPassword) {
            const userHash = await hashPassword(userPassword);
            if (userHash === correctHash) {
                const fileUrl = '../';
                const fileName = 'cert.p12';
            
                const a = document.createElement('a');
                a.href = fileUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                alert('Incorrect password. Please try again.');
            }
        } else {
            alert('Password cannot be empty.');
        }
    };

    return (
        <form method="POST" encType="multipart/form-data" onSubmit={handleSubmit}>
            <label htmlFor="device">Upload Plugin:</label>
            <select name="device" id="device" value={device} onChange={handleDeviceChange}>
                <option value="TAB">Tablet</option>
                <option value="PHN">Phone</option>
            </select>
            <input type="file" name="plugin" />
            <input type="submit" value="Upload" />

            <label htmlFor="device">Download Certificate:</label>
            <input type="button" value="Download" onClick={handleDownload} />
        </form>
    );
}

export default UploadForm;
