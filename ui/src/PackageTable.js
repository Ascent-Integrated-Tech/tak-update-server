import React from "react";

function PackageTable({ packages, onDelete }) {
    return (
        <table border="1">
            <thead>
                <tr>
                    <th></th>
                    <th>Device</th>
                    <th>Name</th>
                    <th>AppID</th>
                    <th>Version</th>
                    <th>Description</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {packages.map(p => (
                    <tr key={p.app_id}>
                        <td><img src={`/icon/${p.app_id}.png`} height="24" alt={p.app_id} /></td>
                        <td>{p.device}</td>
                        <td>{p.name} ({p.type})</td>
                        <td><a href={`/apk/${p.device}/${p.app_id}`}>{p.app_id}</a></td>
                        <td>{p.version} ({p.version_code})</td>
                        <td>{p.description}</td>
                        <td><button onClick={() => {
                            const confirmation = window.confirm("Are you sure you want to delete this package?");
                            if (confirmation) {
                                onDelete(p.app_id, p.device)
                            }
                        }}>Delete</button></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default PackageTable;
