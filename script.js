$(document).ready(function () {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            const audiences = getUniqueAudiences(data);
            const years = getUniqueYears(data);
            const months = getUniqueMonths(data);
        
            populateAudienceDropdown(audiences);
            populateYearDropdown(years);
            populateMonthDropdown(data);

            const table = $('#entriesTable').DataTable({
                data: Object.entries(data)
                    .filter(([id, entry]) => 
                        entry.title && entry.category && entry.datePublished && entry.audience && entry.audience.length > 0
                    ) // Only include entries with required fields
                    .map(([id, entry]) => [
                        entry.title,
                        entry.category,
                        entry.datePublished,
                        entry.audience.join(', '), 
                        `<button class="btn btn-info btn-sm go-btn" onclick="window.location.href='index.html?entry=${id}';">Go</button>
                         <button class="btn btn-warning btn-sm share-btn" data-entry="${id}">Copy Link</button>
                         <button class="btn btn-primary btn-sm view-btn" data-entry="${id}">View</button>`
                    ]),
                columns: [
                    { title: "Title" },
                    { title: "Category" },
                    { title: "Date Published", type: "date", render: (data, type) => type === 'display' ? formatDate(data) : data },
                    { title: "Audience" },
                    { title: "Actions", orderable: false }
                ],
                pageLength: 5,
                lengthMenu: [5, 10],
                createdRow: function (row, data) {
                    const $audienceCell = $('td', row).eq(3);
                    const audiences = $audienceCell.text().split(', ').map(a => a.trim());
                    $audienceCell.html(audiences.map(a => formatAudienceLabel(a)).join(' '));
                }
            });
            

            $('#entriesTable tbody').on('click', 'button.view-btn', function () {
                const tr = $(this).closest('tr');
                const row = table.row(tr);
                const entryId = $(this).data('entry');
                const button = $(this);

                if (row.child.isShown()) {
                    row.child.hide();
                    tr.removeClass('shown');
                    button.text('View');
                } else {
                    row.child(formatChildRow(data[entryId])).show();
                    tr.addClass('shown');
                    button.text('Collapse');
                }
            });

            $('#entriesTable tbody').on('click', 'button.share-btn', function () {
                const entryId = $(this).data('entry');
                const shareableLink = `${window.location.origin}${window.location.pathname}?entry=${entryId}`;
                navigator.clipboard.writeText(shareableLink).then(() => alert('Link copied to clipboard!'));
            });

            $('#audienceFilter, #yearFilter, #monthFilter').on('change', function () {
                filterTable(table);
            });

            handleQueryParameter(data, table);
        })
        .catch(error => console.error('Error loading JSON data:', error));

    function formatAudienceLabel(audience) {
        const audienceColors = {
            "Compensation advisors (CAs)": "label-success",  // Green
            "Change agents": "label-primary",  // Blue
            "Human Resources (HR)": "label-danger" // Red
        };
        const labelClass = audienceColors[audience] || "label-primary"; // Default gray
        return `<span class="label ${labelClass}">${audience}</span>`;
    }

    function formatChildRow(entry) {
        let content = `<div class="card card-body">`;
    
        if (entry.whatYouNeedToKnow) {
            content += `<p><strong>What You Need to Know:</strong></p>${entry.whatYouNeedToKnow}`;
        }
        if (entry.actionRequired) {
            content += `<p><strong>Action Required:</strong></p>${entry.actionRequired}`;
        }
        if (entry.notes) {
            content += `<p><strong>Notes:</strong></p>${entry.notes}`;
        }
        if (entry.resources) {
            content += `<p><strong>Resources:</strong></p>${entry.resources}`;
        }
        if (entry.whoToContact) {
            content += `<p><strong>Who to Contact:</strong></p>${entry.whoToContact}`;
        }
    
        content += `</div>`;
    
        return content !== `<div class="card card-body"></div>` ? content : ''; // If all fields are missing, return empty string
    }
    

    function formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    
    function filterTable(table) {
        const selectedAudiences = $('#audienceFilter').val();
        const selectedYear = $('#yearFilter').val();
        const selectedMonth = $('#monthFilter').val();
    
        let audienceRegex = '';
        if (selectedAudiences && selectedAudiences.length > 0) {
            // Escape special regex characters, including parentheses
            audienceRegex = selectedAudiences
                .map(a => a.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')) // Escapes all regex special characters
                .join('|'); // Join with OR operator for multi-word audiences
        }
    
        let dateRegex = '';
        if (selectedMonth) {
            const monthNum = (new Date(`${selectedMonth} 1, 2000`)).getMonth() + 1;
            dateRegex = `-${monthNum.toString().padStart(2, '0')}-`; // Matches "-02-" for February
        }
    
        if (selectedYear) {
            dateRegex = `^${selectedYear}${dateRegex}`; // Matches "2025-02-"
        }
    
        // Apply regex filtering (ensure audiences with parentheses are matched correctly)
        table.column(2).search(dateRegex, true, false).draw();
        table.column(3).search(audienceRegex, true, false).draw();
    }
    
    
    
    function handleQueryParameter(data, table) {
        const params = new URLSearchParams(window.location.search);
        const entryParam = params.get('entry');
    
        if (entryParam && data[entryParam]) {
            table.clear();
            const entry = data[entryParam];
    
            table.row.add([
                entry.title,
                entry.category,
                formatDate(entry.datePublished),
                entry.audience ? entry.audience.join(', ') : "N/A",
                `<button class="btn btn-warning btn-sm share-btn" data-entry="${entryParam}">Copy Link</button>
                 <button class="btn btn-primary btn-sm view-btn" data-entry="${entryParam}">View</button>`
            ]).draw();
    
            const row = $('#entriesTable tbody').find(`button[data-entry="${entryParam}"]`).closest('tr');
            const tableRow = table.row(row);
            const childContent = formatChildRow(entry);
    
            if (childContent) {
                tableRow.child(childContent).show();
                row.addClass('shown');
                row.find('button.view-btn').text('Collapse');
            } else {
                row.find('button.view-btn').remove(); // Remove "View" button if no extra content
            }
    
            $('.dataTables_filter, .dataTables_length, .filters, .pagination').hide();
            $('#backButton').show();
        }
    }
    

    function getUniqueAudiences(data) {
        return [...new Set(Object.values(data).flatMap(entry => entry.audience))].sort();
    }

    function getUniqueYears(data) {
        return [...new Set(Object.values(data).map(entry => new Date(entry.datePublished).getFullYear()))].sort();
    }

    function populateAudienceDropdown(audiences) {
        const audienceFilter = $('#audienceFilter');
        audiences.forEach(audience => audienceFilter.append($('<option>').val(audience).text(audience)));
        audienceFilter.select2({ placeholder: "Select audiences", allowClear: true });
    }

    function populateYearDropdown(years) {
        const yearFilter = $('#yearFilter');
        years.forEach(year => yearFilter.append($('<option>').val(year).text(year)));
    }
    
    function getUniqueMonths(data) {
        const monthsSet = new Set();
        Object.values(data).forEach(entry => {
            const date = new Date(entry.datePublished);
            const month = date.toLocaleString('default', { month: 'long' });
            monthsSet.add(month);
        });
        return Array.from(monthsSet).sort((a, b) => 
            new Date(`${a} 1, 2000`) - new Date(`${b} 1, 2000`)
        );
    }

    function populateMonthDropdown(data, selectedYear) {
        const monthFilter = $('#monthFilter');
        monthFilter.empty().append($('<option>').val('').text('All Months'));

        const monthsSet = new Set();

        Object.values(data).forEach(entry => {
            const date = new Date(entry.datePublished);
            const entryYear = date.getFullYear().toString();
            const monthName = date.toLocaleString('default', { month: 'long' });

            if (!selectedYear || entryYear === selectedYear) {
                monthsSet.add(monthName);
            }
        });

        Array.from(monthsSet).sort((a, b) =>
            new Date(`${a} 1, 2000`) - new Date(`${b} 1, 2000`)
        ).forEach(month => monthFilter.append($('<option>').val(month).text(month)));

        monthFilter.toggle(monthsSet.size > 0);
    }
});
