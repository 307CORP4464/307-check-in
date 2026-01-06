<?php
require_once 'config.php';
require_once 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Supabase configuration
$SUPABASE_URL = 'YOUR_SUPABASE_URL';
$SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';

function supabaseRequest($method, $endpoint, $data = null) {
    global $SUPABASE_URL, $SUPABASE_KEY;
    
    $url = $SUPABASE_URL . '/rest/v1/' . $endpoint;
    
    $headers = [
        'apikey: ' . $SUPABASE_KEY,
        'Authorization: Bearer ' . $SUPABASE_KEY,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    } elseif ($method === 'PATCH') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    } elseif ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return ['code' => $httpCode, 'data' => json_decode($response, true)];
}

// Clean up old appointments (older than 7 days)
function cleanOldAppointments() {
    $sevenDaysAgo = date('Y-m-d', strtotime('-7 days'));
    $endpoint = "appointments?scheduled_date=lt.$sevenDaysAgo";
    supabaseRequest('DELETE', $endpoint);
}

// Get appointments for a specific date
if ($method === 'GET' && $action === 'list') {
    cleanOldAppointments();
    
    $date = $_GET['date'] ?? date('Y-m-d');
    
    $endpoint = "appointments?scheduled_date=eq.$date&order=scheduled_time.asc,sales_order.asc";
    $result = supabaseRequest('GET', $endpoint);
    
    if ($result['code'] === 200) {
        // Sort by custom time slot order
        $appointments = $result['data'];
        usort($appointments, function($a, $b) {
            $timeOrder = [
                '0800' => 1, '0900' => 2, '0930' => 3, '1000' => 4,
                '1030' => 5, '1100' => 6, '1230' => 7, '1300' => 8,
                '1330' => 9, '1400' => 10, '1430' => 11, '1500' => 12,
                '1530' => 13, 'Work In' => 14
            ];
            $orderA = $timeOrder[$a['scheduled_time']] ?? 99;
            $orderB = $timeOrder[$b['scheduled_time']] ?? 99;
            return $orderA - $orderB;
        });
        
        echo json_encode(['success' => true, 'appointments' => $appointments]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error fetching appointments']);
    }
    exit;
}

// Get appointment count by time slot
if ($method === 'GET' && $action === 'counts') {
    $date = $_GET['date'] ?? date('Y-m-d');
    
    $endpoint = "appointments?scheduled_date=eq.$date&select=scheduled_time";
    $result = supabaseRequest('GET', $endpoint);
    
    if ($result['code'] === 200) {
        $counts = [];
        foreach ($result['data'] as $apt) {
            $time = $apt['scheduled_time'];
            $counts[$time] = ($counts[$time] ?? 0) + 1;
        }
        echo json_encode(['success' => true, 'counts' => $counts]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error fetching counts']);
    }
    exit;
}

// Find appointment by reference (sales order or delivery)
if ($method === 'GET' && $action === 'find') {
    $reference = $_GET['reference'] ?? '';
    $today = date('Y-m-d');
    
    // Try sales order first
    $endpoint = "appointments?sales_order=eq.$reference&scheduled_date=gte.$today&order=scheduled_date.asc,scheduled_time.asc&limit=1";
    $result = supabaseRequest('GET', $endpoint);
    
    if ($result['code'] === 200 && !empty($result['data'])) {
        echo json_encode(['success' => true, 'appointment' => $result['data']<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>]);
        exit;
    }
    
    // Try delivery if sales order not found
    $endpoint = "appointments?delivery=eq.$reference&scheduled_date=gte.$today&order=scheduled_date.asc,scheduled_time.asc&limit=1";
    $result = supabaseRequest('GET', $endpoint);
    
    if ($result['code'] === 200 && !empty($result['data'])) {
        echo json_encode(['success' => true, 'appointment' => $result['data']<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>]);
    } else {
        echo json_encode(['success' => false, 'message' => 'No appointment found']);
    }
    exit;
}

// Upload Excel file
if ($method === 'POST' && $action === 'upload') {
    if (!isset($_FILES['file'])) {
        echo json_encode(['success' => false, 'message' => 'No file uploaded']);
        exit;
    }
    
    $file = $_FILES['file']['tmp_name'];
    
    try {
        $spreadsheet = IOFactory::load($file);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();
        
        $imported = 0;
        $errors = [];
        $appointments = [];
        
        for ($row = 2; $row <= $highestRow; $row++) {
            $dateValue = $sheet->getCell('A' . $row)->getValue();
            $timeValue = $sheet->getCell('B' . $row)->getValue();
            $salesOrder = $sheet->getCell('C' . $row)->getValue();
            $delivery = $sheet->getCell('D' . $row)->getValue();
            
            // Skip empty rows
            if (empty($dateValue) || empty($timeValue)) {
                continue;
            }
            
            // Parse date
            if (is_numeric($dateValue)) {
                $date = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($dateValue)->format('Y-m-d');
            } else {
                $date = date('Y-m-d', strtotime($dateValue));
            }
            
            // Parse time to our format
            if (is_numeric($timeValue)) {
                $timeObj = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($timeValue);
                $timeStr = $timeObj->format('H:i');
            } else {
                $timeStr = date('H:i', strtotime($timeValue));
            }
            
            // Convert to our time slot format (remove colon)
            $timeSlot = str_replace(':', '', $timeStr);
            
            // Check if appointment already exists
            $checkEndpoint = "appointments?scheduled_date=eq.$date&scheduled_time=eq.$timeSlot&sales_order=eq.$salesOrder&delivery=eq.$delivery";
            $checkResult = supabaseRequest('GET', $checkEndpoint);
            
            if ($checkResult['code'] === 200 && empty($checkResult['data'])) {
                $appointments[] = [
                    'scheduled_date' => $date,
                    'scheduled_time' => $timeSlot,
                    'sales_order' => (string)$salesOrder,
                    'delivery' => (string)$delivery,
                    'source' => 'excel'
                ];
            }
        }
        
        // Batch insert appointments
        if (!empty($appointments)) {
            $result = supabaseRequest('POST', 'appointments', $appointments);
            if ($result['code'] === 201) {
                $imported = count($appointments);
            } else {
                $errors[] = 'Error inserting appointments: ' . json_encode($result['data']);
            }
        }
        
        echo json_encode([
            'success' => true, 
            'imported' => $imported,
            'errors' => $errors
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// Create manual appointment
if ($method === 'POST' && $action === 'create') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $appointment = [
        'scheduled_date' => $data['scheduled_date'],
        'scheduled_time' => $data['scheduled_time'],
        'sales_order' => $data['sales_order'],
        'delivery' => $data['delivery'],
        'source' => 'manual'
    ];
    
    $result = supabaseRequest('POST', 'appointments', [$appointment]);
    
    if ($result['code'] === 201) {
        echo json_encode(['success' => true, 'id' => $result['data']<a href="" class="citation-link" target="_blank" style="vertical-align: super; font-size: 0.8em; margin-left: 3px;">[0]</a>['id']]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error creating appointment']);
    }
    exit;
}

// Update manual appointment
if ($method === 'PUT' && $action === 'update') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'];
    
    // Check if it's a manual appointment
    $checkEndpoint = "appointments?id=eq.$id&source=eq.manual";
    $checkResult = supabaseRequest('GET', $checkEndpoint);
    
    if ($checkResult['code'] === 200 && !empty($checkResult['data'])) {
        $updateData = [
            'scheduled_date' => $data['scheduled_date'],
            'scheduled_time' => $data['scheduled_time'],
            'sales_order' => $data['sales_order'],
            'delivery' => $data['delivery']
        ];
        
        $endpoint = "appointments?id=eq.$id";
        $result = supabaseRequest('PATCH', $endpoint, $updateData);
        
        if ($result['code'] === 200) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error updating appointment']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Cannot update Excel-imported appointments']);
    }
    exit;
}

// Delete manual appointment
if ($method === 'DELETE' && $action === 'delete') {
    $id = $_GET['id'] ?? 0;
    
    // Check if it's a manual appointment
    $checkEndpoint = "appointments?id=eq.$id&source=eq.manual";
    $checkResult = supabaseRequest('GET', $checkEndpoint);
    
    if ($checkResult['code'] === 200 && !empty($checkResult['data'])) {
        $endpoint = "appointments?id=eq.$id";
        $result = supabaseRequest('DELETE', $endpoint);
        
        if ($result['code'] === 204 || $result['code'] === 200) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error deleting appointment']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Cannot delete Excel-imported appointments']);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid request']);
?>
