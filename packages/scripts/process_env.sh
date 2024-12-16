#!/bin/sh

usage() {
  echo "Usage: $0 [--env <env_file>] [--out <output_file>] <filename>"
  echo "Options:"
  echo "  --env <env_file>    Source environment variables from specified .env file"
  echo "  --out <output_file> Write output to specified file instead of modifying input"
  exit 1
}

file=""
env_file=""
out_file=""

while [ $# -gt 0 ]; do
  case "$1" in
  --env)
    if [ -z "$2" ]; then
      echo "Error: --env requires a file argument"
      usage
    fi
    env_file="$2"
    shift 2
    ;;
  --out)
    if [ -z "$2" ]; then
      echo "Error: --out requires a file argument"
      usage
    fi
    out_file="$2"
    shift 2
    ;;
  -h | --help)
    usage
    ;;
  *)
    if [ -n "$file" ]; then
      echo "Error: Too many arguments"
      usage
    fi
    file="$1"
    shift
    ;;
  esac
done

if [ -z "$file" ]; then
  echo "Error: No input file specified"
  usage
fi

if [ ! -f "$file" ]; then
  echo "Error: File '$file' not found"
  exit 1
fi

if [ -n "$env_file" ]; then
  if [ ! -f "$env_file" ]; then
    echo "Error: Environment file '$env_file' not found"
    exit 1
  fi
  echo "Loading environment variables from $env_file"
  set -a
  . "$env_file"
  set +a
fi

temp_file="/tmp/process_env.$$"
trap 'rm -f "$temp_file" "$temp_file.bak"' EXIT
cp "$file" "$temp_file"

while IFS= read -r line; do
  case "$line" in
  *'<%='*'%>'*)
    echo "Processing line: $line"
    modified_line="$line"

    while echo "$modified_line" | grep -q '<%=.*%>'; do
      var_name=$(echo "$modified_line" | sed -n 's/.*<%=[ ]*\([A-Za-z_][A-Za-z0-9_]*\)[ ]*%>.*/\1/p')

      if [ -n "$var_name" ]; then
        eval "var_value=\${$var_name}"
        if [ -z "$var_value" ]; then
          echo "Warning: Environment variable '$var_name' is not set"
          var_value=""
        fi

        pattern="<%=[ ]*$var_name[ ]*%>"
        escaped_value=$(printf '%s\n' "$var_value" | sed 's/[\/&]/\\&/g')
        modified_line=$(echo "$modified_line" | sed "s/$pattern/$escaped_value/")
      else
        break
      fi
    done

    escaped_old_line=$(printf '%s\n' "$line" | sed 's/[\/&]/\\&/g')
    escaped_new_line=$(printf '%s\n' "$modified_line" | sed 's/[\/&]/\\&/g')
    sed -i.bak "s/$escaped_old_line/$escaped_new_line/" "$temp_file"
    ;;
  esac
done <"$temp_file"

target_file="${out_file:-$file}"

if cat "$temp_file" >"$target_file"; then
  echo "Template replacement complete"
  if [ -n "$out_file" ]; then
    echo "Output written to '$out_file'"
  fi
else
  echo "Error: Failed to write to '$target_file'"
  exit 1
fi
