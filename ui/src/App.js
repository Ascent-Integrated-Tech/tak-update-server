import React, { useState, useEffect } from "react";
import "./App.css";
import PackageTable from "./PackageTable";
import UploadForm from "./UploadForm";

function App() {
    const [packages, setPackages] = useState([]);

    const fetchPackages = async () => {
        const response = await fetch("/api/packages?token=lmao69");
        const data = await response.json();
        setPackages(data);
    };

    useEffect(() => {
        fetchPackages();
    }, []);

    const handleUploadSuccess = () => {
        fetchPackages();
    };

    const handleDeletePackage = async (appId, device) => {
        const response = await fetch(`/${device}/delete/${appId}?token=lmao69`, {
            method: 'DELETE',
        });

        if (response.ok) {
            fetchPackages();
        }
    };

    return (
        <div className="App">
            <div className="container">
                <PackageTable packages={packages} onDelete={handleDeletePackage} />
                <UploadForm token="lmao69" onUploadSuccess={handleUploadSuccess} />
            </div>
        </div>
    );
}

export default App;
