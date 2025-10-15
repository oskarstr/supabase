FROM supabase/postgres:15.8.1.085

COPY docker/scripts/password-sync-entrypoint.sh /usr/local/bin/password-sync-entrypoint.sh
RUN chmod +x /usr/local/bin/password-sync-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/password-sync-entrypoint.sh"]
CMD ["postgres"]
