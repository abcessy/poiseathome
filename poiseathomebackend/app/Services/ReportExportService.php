<?php

namespace App\Services;

use Illuminate\Support\Facades\Response;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportExportService
{
    public function export($format, $data, $headers, $title = 'Report', $view = 'reports.pdf')
    {
        if ($format === 'csv') {
            return $this->exportCsv($data, $headers, $title);
        } elseif ($format === 'pdf') {
            return $this->exportPdf($data, $headers, $title, $view);
        }

        return null;
    }

    protected function exportCsv($data, $headers, $title)
    {
        $filename = \Illuminate\Support\Str::slug($title) . '-' . now()->format('Ymd_His') . '.csv';

        $callback = function () use ($data, $headers) {
            $file = fopen('php://output', 'w');
            
            // Write headers
            fputcsv($file, array_values($headers));

            // Write data
            foreach ($data as $row) {
                $mapped = [];
                foreach (array_keys($headers) as $key) {
                    $mapped[] = data_get($row, $key, '');
                }
                fputcsv($file, $mapped);
            }
            fclose($file);
        };

        return Response::stream($callback, 200, [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ]);
    }

    protected function exportPdf($data, $headers, $title, $view)
    {
        $pdf = Pdf::loadView($view, [
            'data' => $data,
            'headers' => $headers,
            'title' => $title,
            'generated_at' => now()->format('Y-m-d H:i:s'),
        ]);

        $filename = \Illuminate\Support\Str::slug($title) . '-' . now()->format('Ymd_His') . '.pdf';
        
        return $pdf->download($filename);
    }
}
