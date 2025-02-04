$(document).ready(function() {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            const audiences = getUniqueAudiences(data);
            const years = getUniqueYears(data);
            populateAudienceDropdown(audiences);
            populateYearDropdown(years);
          
            const table = $('#entriesTable').DataTable({
                data: Object.entries(data).map(([date, entry]) => {
                    return [
                        entry.title,
                        entry.category,
                        formatDate(entry.datePublished),
                        entry.audience.join(', '),
                        `<button class="btn btn-info btn-sm action-btn go-btn" onclick="window.location.href='index.html?entry=${date}';">Go to Entry</button>
                        <button class="btn btn-warning btn-sm action-btn share-btn" data-entry="${date}">Copy Link</button>
                         <button class="btn btn-primary btn-sm action-btn view-btn" data-entry="${date}">View</button>
                        `
                    ];
                }),
                columns: [
                    { title: "Title" },
                    { title: "Category" },
                    { title: "Date Published", type: "date" },
                    { title: "Audience" },
                    { title: "Actions", orderable: false }
                ]
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

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function filterTable(table) {
        const selectedAudiences = $('#audienceFilter').val();
        const selectedYear = $('#yearFilter').val();
        let audienceRegex = '';
        let yearRegex = '';

        if (selectedAudiences && selectedAudiences.length > 0) {
            audienceRegex = selectedAudiences.map(audience => `(?=.*${escapeRegex(audience)})`).join('');
        }

        if (selectedYear) {
            yearRegex = `^${selectedYear}`;
        }

        table.column(3).search(audienceRegex, true, false).draw();
        table.column(2).search(yearRegex, true, false).draw();
    }

    function formatDate(dateString) {
        const dateParts = dateString.split('-');
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    }

    function formatChildRow(entry) {
        return `
            <div class="card card-body">
                <p><strong>What You Need to Know:</strong> ${entry.whatYouNeedToKnow.join(' ')}</p>
                <p><strong>Action Required:</strong> ${entry.actionRequired.join(' ')}</p>
                <p><strong>Notes:</strong> ${entry.notes.join(' ')}</p>
                <p><strong>Resources:</strong> ${entry.resources.map(resource => `<a href="${resource.href}">${resource.title}</a>`).join(', ')}</p>
                <p><strong>Who to Contact:</strong> ${entry.whoToContact.map(contact => `<a href="${contact.href}">${contact.title}</a>`).join(', ')}</p>
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
        $('.dataTables_filter, .dataTables_length, .filters').hide();

             // Show the back button
             $('#backButton').show();
        }
    }
});