#!/bin/bash
# Backup and Restore Script for Local AI Stack
# Backs up models, outputs, database, and configurations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${STACK_DIR}/backups"
OLLAMA_MODELS="${HOME}/.ollama/models"
COMFYUI_MODELS="${STACK_DIR}/ComfyUI/models"
COMFYUI_OUTPUT="${STACK_DIR}/ComfyUI/output"
DASHBOARD_DATA="${STACK_DIR}/dashboard/data"
WORKFLOWS_DIR="${STACK_DIR}/workflows"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Create backup directory if it doesn't exist
ensure_backup_dir() {
    mkdir -p "$BACKUP_DIR"
}

# Get size of a directory
get_size() {
    local path="$1"
    if [ -d "$path" ]; then
        du -sh "$path" 2>/dev/null | cut -f1
    else
        echo "N/A"
    fi
}

# Create a full backup
create_backup() {
    ensure_backup_dir

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="ai-stack-backup-${timestamp}"
    local backup_path="${BACKUP_DIR}/${backup_name}"
    local components=()

    print_header "Creating Backup: ${backup_name}"

    mkdir -p "$backup_path"

    # Backup dashboard database
    if [ -f "${DASHBOARD_DATA}/ai-stack.db" ]; then
        print_info "Backing up dashboard database..."
        mkdir -p "${backup_path}/dashboard"
        cp "${DASHBOARD_DATA}/ai-stack.db" "${backup_path}/dashboard/"
        components+=("database")
        print_success "Dashboard database backed up"
    fi

    # Backup workflows
    if [ -d "$WORKFLOWS_DIR" ]; then
        print_info "Backing up workflows..."
        cp -r "$WORKFLOWS_DIR" "${backup_path}/"
        components+=("workflows")
        print_success "Workflows backed up ($(get_size "$WORKFLOWS_DIR"))"
    fi

    # Backup ComfyUI outputs (optional, can be large)
    if [ -d "$COMFYUI_OUTPUT" ] && [ "$1" = "--include-outputs" ]; then
        print_info "Backing up ComfyUI outputs..."
        mkdir -p "${backup_path}/comfyui"
        rsync -a "$COMFYUI_OUTPUT" "${backup_path}/comfyui/"
        components+=("outputs")
        print_success "ComfyUI outputs backed up ($(get_size "$COMFYUI_OUTPUT"))"
    fi

    # Create manifest
    cat > "${backup_path}/manifest.json" <<EOF
{
    "created": "$(date -Iseconds)",
    "components": $(echo "${components[@]}" | jq -R -s -c 'split(" ")'),
    "stack_version": "1.0.0",
    "hostname": "$(hostname)"
}
EOF

    # Compress backup
    print_info "Compressing backup..."
    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name"
    rm -rf "$backup_name"

    local final_size=$(get_size "${BACKUP_DIR}/${backup_name}.tar.gz")
    print_success "Backup created: ${backup_name}.tar.gz (${final_size})"

    echo ""
    echo "Backup location: ${BACKUP_DIR}/${backup_name}.tar.gz"
}

# List available backups
list_backups() {
    ensure_backup_dir

    print_header "Available Backups"

    local backups=$(ls -1 "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | sort -r)

    if [ -z "$backups" ]; then
        print_warning "No backups found"
        return
    fi

    echo "Name                                    Size        Date"
    echo "─────────────────────────────────────────────────────────"

    for backup in $backups; do
        local name=$(basename "$backup")
        local size=$(get_size "$backup")
        local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$backup")
        printf "%-40s %-10s %s\n" "$name" "$size" "$date"
    done
}

# Restore from backup
restore_backup() {
    local backup_file="$1"

    if [ -z "$backup_file" ]; then
        print_error "Please specify a backup file"
        echo "Usage: $0 restore <backup-file.tar.gz>"
        return 1
    fi

    # Check if path is absolute or relative
    if [[ "$backup_file" != /* ]]; then
        backup_file="${BACKUP_DIR}/${backup_file}"
    fi

    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        return 1
    fi

    print_header "Restoring from: $(basename "$backup_file")"

    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT

    print_info "Extracting backup..."
    tar -xzf "$backup_file" -C "$temp_dir"

    local backup_dir=$(ls "$temp_dir")
    local manifest="${temp_dir}/${backup_dir}/manifest.json"

    if [ -f "$manifest" ]; then
        print_info "Backup created: $(jq -r '.created' "$manifest")"
        print_info "Components: $(jq -r '.components | join(", ")' "$manifest")"
    fi

    # Restore database
    if [ -f "${temp_dir}/${backup_dir}/dashboard/ai-stack.db" ]; then
        print_info "Restoring dashboard database..."
        mkdir -p "$DASHBOARD_DATA"
        cp "${temp_dir}/${backup_dir}/dashboard/ai-stack.db" "$DASHBOARD_DATA/"
        print_success "Dashboard database restored"
    fi

    # Restore workflows
    if [ -d "${temp_dir}/${backup_dir}/workflows" ]; then
        print_info "Restoring workflows..."
        cp -r "${temp_dir}/${backup_dir}/workflows/"* "$WORKFLOWS_DIR/"
        print_success "Workflows restored"
    fi

    # Restore ComfyUI outputs
    if [ -d "${temp_dir}/${backup_dir}/comfyui/output" ]; then
        print_info "Restoring ComfyUI outputs..."
        mkdir -p "$COMFYUI_OUTPUT"
        rsync -a "${temp_dir}/${backup_dir}/comfyui/output/" "$COMFYUI_OUTPUT/"
        print_success "ComfyUI outputs restored"
    fi

    print_success "Restore complete!"
}

# Delete old backups (keep last N)
cleanup_backups() {
    local keep=${1:-5}

    ensure_backup_dir

    print_header "Cleaning Up Old Backups"

    local backups=$(ls -1t "${BACKUP_DIR}"/*.tar.gz 2>/dev/null)
    local count=$(echo "$backups" | wc -l | tr -d ' ')

    if [ "$count" -le "$keep" ]; then
        print_info "Only $count backups exist, keeping all (threshold: $keep)"
        return
    fi

    local to_delete=$(echo "$backups" | tail -n +$((keep + 1)))

    for backup in $to_delete; do
        print_info "Deleting: $(basename "$backup")"
        rm -f "$backup"
    done

    local deleted=$((count - keep))
    print_success "Deleted $deleted old backup(s), kept $keep"
}

# Delete a specific backup
delete_backup() {
    local backup_file="$1"

    if [ -z "$backup_file" ]; then
        print_error "Please specify a backup file"
        echo "Usage: $0 delete <backup-file.tar.gz>"
        return 1
    fi

    if [[ "$backup_file" != /* ]]; then
        backup_file="${BACKUP_DIR}/${backup_file}"
    fi

    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        return 1
    fi

    rm -f "$backup_file"
    print_success "Deleted: $(basename "$backup_file")"
}

# Show usage
usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create [--include-outputs]  Create a new backup"
    echo "  list                        List available backups"
    echo "  restore <file>              Restore from a backup"
    echo "  delete <file>               Delete a specific backup"
    echo "  cleanup [keep-count]        Delete old backups (default: keep 5)"
    echo "  status                      Show backup status and disk usage"
    echo ""
    echo "Examples:"
    echo "  $0 create                   Create backup (without outputs)"
    echo "  $0 create --include-outputs Create backup with generated images"
    echo "  $0 restore ai-stack-backup-20240101_120000.tar.gz"
    echo "  $0 cleanup 3                Keep only 3 most recent backups"
}

# Show status
show_status() {
    print_header "Backup Status"

    echo "Source Directories:"
    echo "  Dashboard DB:    ${DASHBOARD_DATA}/ai-stack.db ($(get_size "${DASHBOARD_DATA}/ai-stack.db"))"
    echo "  Workflows:       ${WORKFLOWS_DIR} ($(get_size "$WORKFLOWS_DIR"))"
    echo "  ComfyUI Output:  ${COMFYUI_OUTPUT} ($(get_size "$COMFYUI_OUTPUT"))"
    echo "  Ollama Models:   ${OLLAMA_MODELS} ($(get_size "$OLLAMA_MODELS"))"
    echo "  ComfyUI Models:  ${COMFYUI_MODELS} ($(get_size "$COMFYUI_MODELS"))"
    echo ""
    echo "Backup Directory:  ${BACKUP_DIR}"
    echo "Total Backups:     $(ls -1 "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | wc -l | tr -d ' ')"
    echo "Backup Space Used: $(get_size "$BACKUP_DIR")"
}

# Main
case "${1:-help}" in
    create)
        create_backup "$2"
        ;;
    list)
        list_backups
        ;;
    restore)
        restore_backup "$2"
        ;;
    delete)
        delete_backup "$2"
        ;;
    cleanup)
        cleanup_backups "$2"
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        print_error "Unknown command: $1"
        usage
        exit 1
        ;;
esac
