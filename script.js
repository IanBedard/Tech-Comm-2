$(document).ready(function() {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            const audiences = getUniqueAudiences(data);
            const years = getUniqueYears(data);
            
            populateAudienceDropdown(audiences);
            populateYearDropdown(years);
            populateMonthDropdown();
            const table = $('#entriesTable').DataTable({
                data: Object.entries(data).map(([date, entry]) => {
                    return [
                        entry.title,
                        entry.category,
                        entry.datePublished, // Use raw date for display and filtering
                        entry.audience.join(', '),
                        `<button class="btn btn-info btn-sm action-btn go-btn" onclick="window.location.href='index.html?entry=${date}';">Go to Entry</button>
                         <button class="btn btn-warning btn-sm action-btn share-btn" data-entry="${date}">Copy Link</button>
                         <button class="btn btn-primary btn-sm action-btn view-btn" data-entry="${date}">View</button>`
                    ];
                }),
                columns: [
                    { title: "Title" },
                    { title: "Category" },
                    { title: "Date Published", type: "date",  render: function(data, type, row) {
                        return type === 'display' ? formatDate(data) : data; // Format for display, keep raw for sorting
                    } }, // Use raw date
                    { 
                        title: "Audience", 
                        render: function(data, type, row) {
                            if (type === 'display') {
                                return data.split(', ').map(audience => {
                                    let labelClass = "label-primary"; // Default
                                    if (audience.includes("CA")) labelClass = "label-success";
                                    if (audience.includes("HR")) labelClass = "label-warning";
                                    if (audience.includes("Change agents")) labelClass = "label-info";
                                    
                                    return `<span class="label ${labelClass}">${audience}</span>`;
                                }).join(' ');
                            }
                            return data;
                        } 
                    },
                    
                    { title: "Actions", orderable: false }
                ],
                pageLength: 5, // Set default page length to 5
                lengthMenu: [5, 10] // Allow selection of 5 or 10 entries per page
            });

            $('#entriesTable tbody').on('click', 'button.view-btn', function() {
                const tr = $(this).closest('tr');
                const row = table.row(tr);
                const entryId = $(this).data('entry');
                const button = $(this);

                if (row.child.isShown()) {
                    row.child.hide();
                    tr.removeClass('shown');
                    button.text('View');
                } else {
                    const entry = data[entryId];
                    row.child(formatChildRow(entry)).show();
                    tr.addClass('shown');
                    button.text('Collapse');
                }
            });

            $('#entriesTable tbody').on('click', 'button.share-btn', function() {
                const entryId = $(this).data('entry');
                const shareableLink = `${window.location.origin}${window.location.pathname}?entry=${entryId}`;
                navigator.clipboard.writeText(shareableLink).then(() => {
                    alert('Link copied to clipboard!');
                }, (err) => {
                    console.error('Could not copy text: ', err);
                });
            });

            $('#audienceFilter').on('change', function() {
                filterTable(table);
            });
            
            $('#yearFilter').on('change', function() {
                const selectedYear = $(this).val();
                if (selectedYear) {
                    $('#monthFilter').show();
                } else {
                    $('#monthFilter').hide();
                }
                filterTable(table);
            });
            
            $('#monthFilter').on('change', function() {
                filterTable(table);
            });

            handleQueryParameter(data, table);
        })
        .catch(error => console.error('Error loading JSON data:', error));

    function getUniqueAudiences(data) {
        const audienceSet = new Set();
        Object.values(data).forEach(entry => {
            entry.audience.forEach(audience => audienceSet.add(audience));
        });
        return Array.from(audienceSet).sort();
    }

    function getUniqueYears(data) {
        const yearSet = new Set();
        Object.values(data).forEach(entry => {
            const year = new Date(entry.datePublished).getFullYear();
            yearSet.add(year);
        });
        return Array.from(yearSet).sort();
    }
    function getUniqueMonths(data) {
        const monthSet = new Set();
        Object.values(data).forEach(entry => {
            const month = new Date(entry.datePublished).toLocaleString('default', { month: 'long' });
            monthSet.add(month);
        });
        return Array.from(monthSet).sort((a, b) => new Date(Date.parse(a + " 1, 2021")) - new Date(Date.parse(b + " 1, 2021")));
    }
    function populateAudienceDropdown(audiences) {
        const audienceFilter = $('#audienceFilter');
        audiences.forEach(audience => {
            const option = $('<option>').val(audience).text(audience);
            audienceFilter.append(option);
        });
        audienceFilter.select2({
            placeholder: "Select audiences",
            allowClear: true
        });
    }

    function populateYearDropdown(years) {
        const yearFilter = $('#yearFilter');
        years.forEach(year => {
            const option = $('<option>').val(year).text(year);
            yearFilter.append(option);
        });
    }
    function populateMonthDropdown() {
        const monthFilter = $('#monthFilter');
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        months.forEach(month => {
            const option = $('<option>').val(month).text(month);
            monthFilter.append(option);
        });
    }
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function filterTable(table) {
        const selectedAudiences = $('#audienceFilter').val();
        const selectedYear = $('#yearFilter').val();
        const selectedMonth = $('#monthFilter').val();
        let audienceRegex = '';
        let dateRegex = '';
    
        if (selectedAudiences && selectedAudiences.length > 0) {
            audienceRegex = selectedAudiences.map(audience => `(?=.*${escapeRegex(audience)})`).join('');
        }
    
        if (selectedYear || selectedMonth) {
            dateRegex = '^';
            if (selectedYear) {
                dateRegex += selectedYear;
            }
            if (selectedMonth) {
                const monthIndex = new Date(Date.parse(selectedMonth + " 1, 2021")).getMonth() + 1;
                dateRegex += `-${monthIndex.toString().padStart(2, '0')}`;
            }
        }
    
        console.log("Selected Audiences:", selectedAudiences);
        console.log("Selected Year:", selectedYear);
        console.log("Selected Month:", selectedMonth);
        console.log("Audience Regex:", audienceRegex);
        console.log("Date Regex:", dateRegex);
    
        table.column(2).search(dateRegex, true, false).draw(); // Use raw date column for filtering
        table.column(3).search(audienceRegex, true, false).draw();
    }
    

 function formatDate(dateString) {
    if (!dateString) return ''; // Handle empty or undefined dates
    const dateParts = dateString.split('-');
    if (dateParts.length !== 3) return dateString; // Return original if format is unexpected
    const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}
function formatContent(content) {
    if (!content) return ''; // Handle empty fields

    // Check if it's a string
    if (typeof content === "string") {
        return `<p>${content}</p>`; // Return a paragraph if it's just a string
    } 

    // Check if it's an array
    else if (Array.isArray(content)) {
        return `<ul>${content.map(item => `<li>${item}</li>`).join('')}</ul>`; // Return a list if it's an array
    }

    // Check if it's an object with both 'text' and 'links' (for resources format)
    else if (typeof content === "object" && content.text && Array.isArray(content.links)) {
        const links = content.links.map(link => `<li><a href="${link.href}">${link.title}</a></li>`).join('');
        return `<p>${content.text}</p><ul>${links}</ul>`; // Return the text and a list of links
    }

    // Fallback
    return '';
}

function formatChildRow(entry) {
    return `
        <div class="card card-body">
            <p><strong>What You Need to Know:</strong></p> ${formatContent(entry.whatYouNeedToKnow)}
            <p><strong>Action Required:</strong></p> ${formatContent(entry.actionRequired)}
            <p><strong>Notes:</strong></p> ${formatContent(entry.notes)}
            <p><strong>Resources:</strong> 
                ${formatContent(entry.resources)}
            </p>
            <p><strong>Who to Contact:</strong> 
                ${entry.whoToContact.length > 0 ? entry.whoToContact.map(contact => `<a href="${contact.href}">${contact.title}</a>`).join(', ') : "None"}
            </p>
        </div>
    `;
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
                entry.audience.join(', '),
                `<button class="btn btn-warning btn-sm share-btn" data-entry="${entryParam}">Copy Link</button>
                 <button class="btn btn-primary btn-sm view-btn" data-entry="${entryParam}">View</button>`
            ]).draw();
    
            const row = $('#entriesTable').DataTable().rows().nodes().to$().find(`button[data-entry="${entryParam}"]`).closest('tr');
            const tableRow = $('#entriesTable').DataTable().row(row);
            if (!tableRow.child.isShown()) {
                tableRow.child(formatChildRow(entry)).show();
                row.addClass('shown');
                row.find('button.view-btn').text('Collapse');
            }
    
             // Hide the search bar, entry number, audience filter, and year filter
        $('.dataTables_filter, .dataTables_length, .filters, .pagination').hide();

             // Show the back button
             $('#backButton').show();
        }
    }
});