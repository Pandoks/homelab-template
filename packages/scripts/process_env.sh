#!/bin/sh

if [ $# -ne 1 ]; then
    echo "Usage: $0 <filename>"
    exit 1
fi

file="$1"

if [ ! -f "$file" ]; then
    echo "Error: File '$file' not found"
    exit 1
fi

temp_file=$(mktemp)
cp "$file" "$temp_file"

pattern='<%=[ ]*([A-Za-z_][A-Za-z0-9_]*)[ ]*%>'

while IFS= read -r line; do
    if [[ $line =~ $pattern ]]; then
        env_var="${BASH_REMATCH[1]}"
        env_value="${!env_var}"

        if [ -z "$env_value" ]; then
            echo "Warning: Environment variable '$env_var' is not set"
            env_value=""
        fi

        escaped_value=$(printf '%s\n' "$env_value" | sed 's/[\/&]/\\&/g')
        sed -i.bak "s|<%=[ ]*${env_var}[ ]*%>|${escaped_value}|g" "$temp_file"
    fi
done < "$file"

mv "$temp_file" "$file"
echo "Template replacement complete"
