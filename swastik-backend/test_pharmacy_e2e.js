const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { io } = require('socket.io-client');
const path = require('path');

const API_URL = 'http://127.0.0.1:5001/api';

async function testFlow() {
    try {
        console.log("1. Checking backend health...");
        const health = await axios.get(`http://127.0.0.1:5001/health`);
        console.log("Health OK:", health.data.status);

        console.log("2. Patient Login...");
        let token;
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email: 'patient@test.com',
                password: 'password123'
            });
            token = loginRes.data.token || loginRes.data.data?.token;
            console.log("Patient logged in!");
        } catch (e) {
            console.log("User might not exist, registering...");
            const regRes = await axios.post(`${API_URL}/auth/register`, {
                email: 'patient@test.com',
                password: 'password123',
                name: 'Test Patient',
                role: 'patient',
                phone: '1234567890'
            });
            token = regRes.data.token || regRes.data.data?.token;
            console.log("Patient registered!");
        }
        
        if (!token) throw new Error("No token received");

        console.log("3. Create Pharmacy Order...");
        const orderRes = await axios.post(`${API_URL}/medicines/orders`, {
            pharmacy_id: 'test-pharmacy-123',
            items: [
                {
                    medicine_id: 'med-123',
                    name: 'Paracetamol',
                    quantity: 2,
                    price: 50
                }
            ],
            delivery_address: '123 Test St',
            total_amount: 100
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const orderId = orderRes.data.data.id;
        console.log("Order created! ID:", orderId);

        console.log("4. Uploading Prescription...");
        fs.writeFileSync('test_presc.jpg', 'fake image data');
        const formData = new FormData();
        formData.append('prescription', fs.createReadStream('test_presc.jpg'));
        formData.append('order_id', orderId);
        
        const uploadRes = await axios.post(`${API_URL}/medicines/upload-prescription`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log("Prescription uploaded! URL:", uploadRes.data.data);
        
        console.log("5. Connecting Socket.io to track location...");
        const socket = io('http://127.0.0.1:5001', {
            auth: { token }
        });
        
        socket.on('connect', async () => {
            console.log("Patient socket connected! ID:", socket.id);
            try {
                console.log("6. Agent Login...");
                let agentToken;
                try {
                    const agentLoginRes = await axios.post(`${API_URL}/auth/login`, {
                        email: 'agent@test.com',
                        password: 'password123'
                    });
                    agentToken = agentLoginRes.data.token || agentLoginRes.data.data?.token;
                } catch(e) {
                    const agentRegRes = await axios.post(`${API_URL}/auth/register`, {
                        email: 'agent@test.com',
                        password: 'password123',
                        name: 'Test Agent',
                        role: 'delivery_agent',
                        phone: '0987654321'
                    });
                    agentToken = agentRegRes.data.token || agentRegRes.data.data?.token;
                }
                
                console.log("Agent logged in!");
                
                console.log("7. Sending Agent Location Update...");
                const locRes = await axios.post(`${API_URL}/delivery-agents/location`, {
                    latitude: 28.7041,
                    longitude: 77.1025
                }, {
                    headers: { Authorization: `Bearer ${agentToken}` }
                });
                
                console.log("Location update success:", locRes.data.success);
                console.log("END-TO-END FLOW VERIFIED SUCCESSFULLY!");
                process.exit(0);
            } catch (err) {
                console.error("Agent flow failed:", err.response ? JSON.stringify(err.response.data) : err.stack);
                process.exit(1);
            }
        });
        
    } catch (e) {
        console.error("Error in testFlow:", e.response ? JSON.stringify(e.response.data) : e.stack);
        process.exit(1);
    }
}

testFlow();
