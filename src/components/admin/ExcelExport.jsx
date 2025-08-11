import * as XLSX from 'xlsx';
import { supabase } from '../../api/supabase';

const ExcelExport = () => {
    const exportJobOrders = async () => {
        const { data: jobOrders, error } = await supabase
            .from('job_orders')
            .select('*')
            .eq('status', 'synced');

        if (error) {
            console.error('Error fetching job orders:', error);
            return;
        }

        // Transform data for Excel
        const excelData = jobOrders.map(order => ({
            'Case #': order.case_number,
            'Date': order.order_date,
            'Customer Name': order.customer_name,
            'Address': order.customer_address,
            'Email': order.customer_email,
            'SKU': order.sku,
            'Coverage': order.coverage.join(', '),
            'Complaint': order.complaint_details,
            'Dispatch Date': order.dispatch_date,
            'Dispatch Time': order.dispatch_time,
            'Tested Before': order.tested_before ? 'Yes' : 'No',
            'Tested After': order.tested_after ? 'Yes' : 'No',
            'Troubles Found': order.troubles_found,
            'Notes': order.other_notes,
            'Media URLs': order.media_urls.join('\n'),
            'Signature URL': order.signature_url,
            'Technician': order.technician_id,
            'Status': order.status
        }));

        // Create workbook
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Job Orders');

        // Export file
        XLSX.writeFile(wb, 'Mondo_Cucina_Job_Orders.xlsx');
    };

    return (
        <button onClick={exportJobOrders} className="export-button">
            <i className="fas fa-file-excel"></i> Download All Job Orders (Excel)
        </button>
    );
};