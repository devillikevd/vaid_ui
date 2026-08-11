const PDFDocument = require('pdfkit');
const { supabaseAdmin } = require('../config/supabase');
const axios = require('axios');

class PrescriptionPdfService {
    async generatePdf(appointmentId, res) {
        try {
            // 1. Fetch Appointment and related Data
            const { data: appointment, error: aptError } = await supabaseAdmin
                .from('appointments')
                .select(`
                    id, 
                    date,
                    time_slot,
                    patients (
                        id,
                        name,
                        age,
                        gender,
                        phone
                    ),
                    doctors (
                        id,
                        name,
                        specialization,
                        qualifications,
                        registration_number,
                        clinic_address,
                        phone,
                        digital_signature_url
                    )
                `)
                .eq('id', appointmentId)
                .single();

            if (aptError || !appointment) {
                throw new Error('Appointment not found');
            }

            // 2. Fetch Consultation ID
            const { data: consultation, error: consError } = await supabaseAdmin
                .from('consultations')
                .select('id')
                .eq('appointment_id', appointmentId)
                .single();

            if (consError || !consultation) {
                throw new Error('Consultation not found');
            }

            // 3. Fetch Prescription
            const { data: prescription, error: rxError } = await supabaseAdmin
                .from('prescriptions')
                .select(`
                    id,
                    diagnosis,
                    notes,
                    follow_up_date,
                    dietary_advice,
                    lifestyle_advice,
                    instructions,
                    prescription_items (
                        medicine_name,
                        dosage,
                        frequency,
                        duration,
                        quantity,
                        instructions,
                        before_food
                    )
                `)
                .eq('consultation_id', consultation.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (rxError || !prescription) {
                throw new Error('Prescription not found');
            }

            // 4. Generate PDF
            const doc = new PDFDocument({ margin: 50 });
            
            res.setHeader('Content-disposition', `attachment; filename=Prescription_${appointment.patients.name}_${appointment.date}.pdf`);
            res.setHeader('Content-type', 'application/pdf');
            
            doc.pipe(res);

            // --- Header ---
            doc.fontSize(20).font('Helvetica-Bold').text(`Dr. ${appointment.doctors.name}`, { align: 'left' });
            doc.fontSize(10).font('Helvetica').text(`${appointment.doctors.specialization} | ${appointment.doctors.qualifications?.join(', ') || ''}`);
            doc.text(`Reg. No: ${appointment.doctors.registration_number || 'N/A'}`);
            if (appointment.doctors.clinic_address) {
                doc.text(`Clinic: ${appointment.doctors.clinic_address}`);
            }
            doc.text(`Phone: ${appointment.doctors.phone || 'N/A'}`);
            
            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();

            // --- Patient Details ---
            const topY = doc.y;
            doc.font('Helvetica-Bold').text(`Patient Name: `, 50, topY, { continued: true }).font('Helvetica').text(appointment.patients.name);
            doc.font('Helvetica-Bold').text(`Age/Gender: `, 50, doc.y, { continued: true }).font('Helvetica').text(`${appointment.patients.age || '-'} / ${appointment.patients.gender || '-'}`);
            
            doc.font('Helvetica-Bold').text(`Date: `, 400, topY, { continued: true }).font('Helvetica').text(new Date(appointment.date).toLocaleDateString());
            doc.font('Helvetica-Bold').text(`Prescription ID: `, 400, doc.y, { continued: true }).font('Helvetica').text(prescription.id.substring(0, 8));

            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();

            // --- Clinical Info ---
            if (prescription.diagnosis) {
                doc.font('Helvetica-Bold').text(`Diagnosis: `, { continued: true }).font('Helvetica').text(prescription.diagnosis);
            }
            if (prescription.notes) {
                doc.font('Helvetica-Bold').text(`Clinical Notes: `, { continued: true }).font('Helvetica').text(prescription.notes);
            }
            doc.moveDown();

            // --- Rx Symbol ---
            doc.fontSize(24).font('Helvetica-Bold').text('Rx', { align: 'left' });
            doc.moveDown(0.5);

            // --- Medicines ---
            doc.fontSize(10);
            (prescription.prescription_items || []).forEach((item, index) => {
                doc.font('Helvetica-Bold').text(`${index + 1}. ${item.medicine_name}`);
                
                let details = `${item.dosage} | ${item.frequency} | ${item.duration}`;
                if (item.quantity) details += ` | Qty: ${item.quantity}`;
                if (item.before_food !== null) details += item.before_food ? ' | Before Food' : ' | After Food';
                
                doc.font('Helvetica').text(details, { indent: 20 });
                if (item.instructions) {
                    doc.text(`Instruction: ${item.instructions}`, { indent: 20, color: '#666666' });
                    doc.fillColor('black'); // reset
                }
                doc.moveDown(0.5);
            });

            // --- Advices ---
            doc.moveDown();
            if (prescription.dietary_advice || prescription.lifestyle_advice) {
                doc.font('Helvetica-Bold').text('Advice:');
                if (prescription.dietary_advice) doc.font('Helvetica').text(`• Diet: ${prescription.dietary_advice}`, { indent: 10 });
                if (prescription.lifestyle_advice) doc.font('Helvetica').text(`• Lifestyle: ${prescription.lifestyle_advice}`, { indent: 10 });
                doc.moveDown();
            }

            if (prescription.follow_up_date) {
                doc.font('Helvetica-Bold').text(`Follow-up Date: `, { continued: true }).font('Helvetica').text(new Date(prescription.follow_up_date).toLocaleDateString());
            }

            // --- Footer / Signature ---
            doc.moveDown(3);
            const sigY = doc.y;
            
            // Try fetching signature if exists
            if (appointment.doctors.digital_signature_url) {
                try {
                    const response = await axios.get(appointment.doctors.digital_signature_url, { responseType: 'arraybuffer' });
                    const sigBuffer = Buffer.from(response.data, 'binary');
                    doc.image(sigBuffer, 400, sigY - 40, { width: 100 });
                } catch (e) {
                    console.error("Failed to load digital signature image", e.message);
                }
            }

            doc.moveTo(400, sigY + 10).lineTo(550, sigY + 10).stroke();
            doc.text(`Signature of Dr. ${appointment.doctors.name}`, 400, sigY + 15, { width: 150, align: 'center' });

            // Finalize PDF
            doc.end();
            
        } catch (error) {
            console.error("PDF Generation Error:", error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: error.message || 'Failed to generate PDF' });
            }
        }
    }
}

module.exports = new PrescriptionPdfService();
