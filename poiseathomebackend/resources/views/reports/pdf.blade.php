<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; }
        .header { margin-bottom: 20px; text-align: center; }
        .title { font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #6d28d9; }
        .subtitle { font-size: 14px; margin-bottom: 10px; }
        .meta { font-size: 10px; color: #666; margin-bottom: 20px; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f3e8ff; color: #6d28d9; }
        tr:nth-child(even) { background-color: #faf5ff; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Poise Hair Center Salon</div>
        <div class="subtitle">PoiseAtHome - {{ $title }}</div>
    </div>
    
    <div class="meta">
        Generated on: {{ $generated_at }}
    </div>

    <table>
        <thead>
            <tr>
                @foreach($headers as $key => $label)
                    <th>{{ $label }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach($data as $row)
                <tr>
                    @foreach(array_keys($headers) as $key)
                        <td>{{ data_get($row, $key, '') }}</td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
